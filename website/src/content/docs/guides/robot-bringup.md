---
title: Put Your Package on a Robot
description: Move your own ROS 2 package from development computer to real Waypoint hardware.
---

Come here after your package is in your GitHub repository and your Waypoint kit has arrived!

By the end you will have a safe path from package installation to supervised driving. The robot gets to move only after the boring checks pass, which is exactly the point.

:::caution[Real hardware]
For every powered motor check, put the robot on a stand or remove the wheels so the chassis cannot drive away.
:::

## 1. Prepare the Raspberry Pi

Flash **Ubuntu Server 24.04 LTS, 64-bit** to the Raspberry Pi Zero 2 W with Raspberry Pi Imager. Ubuntu lists the Zero 2 W as supported for Ubuntu Server; use Server, not Desktop, because the small Pi does not need to render RViz. Follow Ubuntu's [Raspberry Pi installation guide](https://ubuntu.com/tutorials/how-to-install-ubuntu-on-your-raspberry-pi) for Imager and first-boot details.

During Imager setup, choose a username, password, Wi-Fi network, and hostname you will remember. Boot the Pi, then connect over SSH from an Ubuntu terminal. This example uses `robot` and `cool-rover.local`; replace those two values with the username and hostname you chose.

```bash title="Computer Ubuntu terminal"
PI_USER="robot"
PI_HOST="cool-rover.local"
ssh "$PI_USER@$PI_HOST"
```

Install the ROS 2 repository and base tools by following [Set Up Ubuntu for ROS 2](/reference/set-up-ubuntu-for-ros/) on the Pi, choosing the **robot** package list instead of the desktop list. Then install the packages your physical interfaces need:

```bash title="Raspberry Pi SSH terminal"
sudo apt update
sudo apt install -y python3-gpiozero python3-lgpio python3-smbus python3-smbus2 i2c-tools
```

## 2. Enable and Check I2C

Your IMU needs the Pi's I2C bus enabled. Add `dtparam=i2c_arm=on` to `/boot/firmware/config.txt`, reboot, then reconnect over SSH.

With the IMU wired and powered, scan the bus:

```bash title="Raspberry Pi SSH terminal"
i2cdetect -y 1
```

You should see the address your IMU uses, often `68` or `69` for an MPU6050. If no address appears, stop and check power, ground, SDA, SCL, and the board's address pin before blaming ROS.

## 3. Bring Your Package Over

Clone your repository into a workspace on the Pi. Keep the same workspace and package names you used while developing, but do not assume that a path from your laptop exists on the robot. This example uses `cool_rover_ws`, `cool_rover`, and `https://github.com/cool-hacker/cool-rover.git`. Replace those values with yours before running the commands.

```bash title="Raspberry Pi SSH terminal"
WORKSPACE_NAME="cool_rover_ws"
PACKAGE_NAME="cool_rover"
REPOSITORY_URL="https://github.com/cool-hacker/cool-rover.git"

mkdir -p ~/"$WORKSPACE_NAME"/src
cd ~/"$WORKSPACE_NAME"/src
git clone "$REPOSITORY_URL"
cd ~/"$WORKSPACE_NAME"
source /opt/ros/jazzy/setup.bash
rosdep install -i --from-paths src --rosdistro jazzy -y
colcon build --symlink-install
source install/setup.bash
```

If `rosdep` reports a missing system dependency, add the correct dependency to `package.xml` only after you know which node needs it. Do not fix a build by randomly adding every ROS package you can find.

## 4. Prove the Package Installed

Before launching hardware, check that ROS can find the package, executables, launch files, and installed assets from the Pi's `install/` space.

```bash title="Raspberry Pi SSH terminal"
ros2 pkg prefix "$PACKAGE_NAME"
ros2 pkg executables "$PACKAGE_NAME"
ros2 launch "$PACKAGE_NAME" bringup.launch.py --show-args
```

Expected result:

- `ros2 pkg prefix` prints a path inside `~/cool_rover_ws/install/`
- `ros2 pkg executables` lists your motor, IMU, odometry, and autonomy commands
- `ros2 launch ... --show-args` finds the launch file without using a path into `src/`

If launch or config files are missing, return to [Create Your Workspace](/guides/ros2-package-guide/workspace/) and confirm your `setup.py` installs `launch/`, `config/`, `urdf/`, `meshes/`, and RViz files as package data where appropriate.

## 5. Start Bringup With Motors Secured

Your bringup launch file should start the nodes you made.

- your motor node
- your IMU node
- your `open_loop_odom` node
- `robot_state_publisher` only if you completed the optional robot-model polish

I would keep the initial motor-output limit low and quick to override from the launch command.

```bash title="Raspberry Pi SSH terminal"
ros2 launch "$PACKAGE_NAME" bringup.launch.py
```

With bringup running, the robot should sit still. If a wheel moves before any command arrives, cut motor power, stop the launch file, and fix startup-zero behavior before continuing.

## 6. Check the ROS Graph

Open a second SSH terminal to the Pi and source the same workspace:

```bash title="Second Raspberry Pi SSH terminal"
WORKSPACE_NAME="cool_rover_ws"
PACKAGE_NAME="cool_rover"

source /opt/ros/jazzy/setup.bash
source ~/"$WORKSPACE_NAME"/install/setup.bash
ros2 node list
ros2 topic list -t
ros2 topic info /cmd_vel --verbose
ros2 param get /motor_driver max_output
ros2 param get /motor_driver command_timeout_s
ros2 param get /imu_node frame_id
```

You should find `/motor_driver`, `/imu_node`, and `/open_loop_odom`, plus `/cmd_vel`, `/imu/data_raw`, `/odom`, `/path`, `/tf`, and `/tf_static` where appropriate. `ros2 topic info /cmd_vel --verbose` should show the motor and odometry nodes as subscribers. Before teleop or autonomy starts, it should not show an unexpected command publisher.

If a node is absent, read the launch output before changing code. A missing node usually points to an import error, bad executable entry, missing dependency, or a YAML key that does not match the node name.

## 7. Prove the Watchdog

Keep the wheels secured. Publish one small command, then stop publishing. The motor node should stop by itself after its configured timeout.

```bash title="Second Raspberry Pi SSH terminal"
ros2 topic pub -1 /cmd_vel geometry_msgs/msg/Twist "{linear: {x: 0.06}, angular: {z: 0.0}}"
```

Expected behavior:

- both sides briefly request forward motion
- the command ends after one message
- the watchdog returns both motor outputs to zero shortly after the timeout
- no terminal remains publishing `/cmd_vel`

If the motors keep running, cut motor power and fix the watchdog before trying any normal driving.

## 8. Check the IMU

With the robot still on the stand, inspect the raw IMU message:

```bash title="Second Raspberry Pi SSH terminal"
ros2 topic echo /imu/data_raw --once
ros2 topic hz /imu/data_raw
```

Expected result:

- the header timestamp is current
- `header.frame_id` matches the IMU frame you documented, such as `imu_link`
- acceleration is in meters per second squared
- angular velocity is in radians per second
- `orientation_covariance[0]` is `-1.0` if your node does not publish a fused orientation
- the publish rate is close to your configured rate

Leave the robot still, then gently rotate it by hand. A still gyro should sit near zero after calibration; turning the robot should change the matching gyro axis. If messages never arrive, use `i2cdetect -y 1` again and inspect the I2C wiring and configured address.

## 9. Check Each Motor Direction

Use brief low-speed commands. Keep the wheels secured.

```bash title="Second Raspberry Pi SSH terminal"
ros2 topic pub -1 /cmd_vel geometry_msgs/msg/Twist "{linear: {x: 0.08}, angular: {z: 0.0}}"
ros2 topic pub -1 /cmd_vel geometry_msgs/msg/Twist "{linear: {x: 0.0}, angular: {z: 0.25}}"
```

For positive `linear.x`, both sides should request forward movement. For positive `angular.z`, the robot should request a counter-clockwise turn using the convention you documented for left and right. If a side turns the wrong way, correct that side's inversion value in configuration. If a motor only turns one direction, inspect that driver's two direction inputs, the physical wiring, and the motor-driver channel before changing the ROS mixing math.

## 10. Check Odometry, TF, and Path

With movement commands arriving, inspect the open-loop odometry messages:

```bash title="Second Raspberry Pi SSH terminal"
ros2 topic echo /odom --once
ros2 topic echo /path --once
ros2 run tf2_ros tf2_echo odom base_link
```

Expected result:

- `/odom` uses `header.frame_id: odom`
- `/odom` uses `child_frame_id: base_link`
- `/path` uses the `odom` frame
- `tf2_echo odom base_link` shows the same pose trend as `/odom`
- pose changes come from requested or applied commands, not measured wheel encoder travel

The path will drift because the kit has no wheel encoders. Tune linear and angular scale parameters from observed motion, but keep the code honest about being command-based.

## 11. Connect Your Computer

Put the computer and robot on the same non-guest Wi-Fi network. ROS 2 nodes discover one another through DDS, so both sides need matching network settings.

Choose one `ROS_DOMAIN_ID` between `0` and `101` for your robot. Use the same number in the robot's SSH terminal and the computer's Ubuntu terminal. Do not use a value someone else is using nearby.

```bash title="Raspberry Pi SSH terminal and computer Ubuntu terminal"
ROS_DOMAIN_ID_VALUE=37
export ROS_DOMAIN_ID="$ROS_DOMAIN_ID_VALUE"
export ROS_LOCALHOST_ONLY=0
```

Source ROS and your workspace in each terminal before using ROS commands. A topic published under one domain is invisible to a terminal in another domain.

If your computer runs Windows 11 with WSL, enable mirrored networking before testing ROS discovery. In the Windows file `%USERPROFILE%\.wslconfig`, add:

```ini title=".wslconfig"
[wsl2]
networkingMode=mirrored
```

Then close all WSL terminals and run this in PowerShell:

```powershell title="Windows PowerShell"
wsl --shutdown
```

Open Ubuntu WSL again. Microsoft documents mirrored mode because it adds multicast support and lets WSL participate directly on the local network: [WSL networking](https://learn.microsoft.com/en-us/windows/wsl/networking).

Before starting RViz or teleop, test both directions with tiny string topics.

```bash title="Raspberry Pi SSH terminal"
source /opt/ros/jazzy/setup.bash
export ROS_DOMAIN_ID="$ROS_DOMAIN_ID_VALUE"
export ROS_LOCALHOST_ONLY=0
ros2 topic pub /network_test_from_pi std_msgs/msg/String "{data: hello_from_pi}" -r 1
```

```bash title="Computer Ubuntu terminal"
source /opt/ros/jazzy/setup.bash
export ROS_DOMAIN_ID="$ROS_DOMAIN_ID_VALUE"
export ROS_LOCALHOST_ONLY=0
ros2 topic echo /network_test_from_pi
```

Then reverse the test:

```bash title="Computer Ubuntu terminal"
ros2 topic pub /network_test_from_computer std_msgs/msg/String "{data: hello_from_computer}" -r 1
```

```bash title="Raspberry Pi SSH terminal"
ros2 topic echo /network_test_from_computer
```

Only move on once both messages arrive. If discovery fails, first check the Wi-Fi network, domain number, `ROS_LOCALHOST_ONLY`, firewall settings, and whether both machines have working clocks:

```bash title="Ubuntu terminal on both machines"
timedatectl status
```

If those checks are correct and discovery still fails, use the same middleware implementation on both computers:

```bash title="Ubuntu terminal on both machines"
sudo apt update
sudo apt install -y ros-jazzy-rmw-cyclonedds-cpp
export RMW_IMPLEMENTATION=rmw_cyclonedds_cpp
```

Restart the network test after setting it on both sides. ROS 2 supports multiple middleware implementations, and the [`RMW_IMPLEMENTATION` setting](https://docs.ros.org/en/jazzy/Installation/RMW-Implementations.html) selects the one a terminal uses.

## 12. Use RViz From the Computer

Run RViz on the development computer, *not the Pi.*

```bash title="Computer Ubuntu terminal"
WORKSPACE_NAME="cool_rover_ws"

source /opt/ros/jazzy/setup.bash
source ~/"$WORKSPACE_NAME"/install/setup.bash
rviz2
```

In RViz:

- set **Fixed Frame** to `odom`
- add **Grid**
- add **TF**
- add **Path** and set the topic to `/path`
- add **Axes** and set the reference frame to `base_link`
- add **RobotModel** only if you completed the optional robot-model polish step

Keep the view minimal. It should help you see the robot's origin, body direction, and path. In the TF display, confirm `odom -> base_link` exists and that your package provides or documents `base_link -> imu_link`.

## 13. Drive Manually

Install standard keyboard teleop on the computer that will drive the robot:

```bash title="Computer Ubuntu terminal"
ROS_DOMAIN_ID_VALUE=37

sudo apt update
sudo apt install -y ros-jazzy-teleop-twist-keyboard
source /opt/ros/jazzy/setup.bash
export ROS_DOMAIN_ID="$ROS_DOMAIN_ID_VALUE"
export ROS_LOCALHOST_ONLY=0
ros2 run teleop_twist_keyboard teleop_twist_keyboard
```

Watch `/cmd_vel` in another terminal. Confirm that releasing the key stops publishing movement or sends zero movement, and confirm the robot-side watchdog still stops the motors if teleop exits unexpectedly.

```bash title="Second computer Ubuntu terminal"
ROS_DOMAIN_ID_VALUE=37

source /opt/ros/jazzy/setup.bash
export ROS_DOMAIN_ID="$ROS_DOMAIN_ID_VALUE"
ros2 topic info /cmd_vel --verbose
ros2 topic echo /cmd_vel
```

Move to floor driving only after stand checks pass. Start with low speed limits and enough open space to cut power without chasing the robot. If standard terminal teleop works but feels awkward on your system, the optional [event-based keyboard teleop extra](/extras/event-based-keyboard-teleop/) can be added later.

## 14. Run Autonomy Last

Only after manual movement, IMU, odometry, TF, and RViz all behave individually should you start the autonomous node you wrote. Begin with low speeds and a short routine. Watch the robot and `/cmd_vel`; stop immediately if its real behavior differs from your planned table.

Before autonomy starts, check publisher count from a sourced terminal:

```bash title="Computer Ubuntu terminal"
ros2 topic info /cmd_vel --verbose
```

Teleop and autonomy should not publish at the same time unless you deliberately added code to swap between these commands.

- it sends an initial zero command before movement
- each segment matches the route table in your README
- `Ctrl+C` or node shutdown sends zero
- the robot-side watchdog stops the motors if autonomy stops publishing
- the routine ends with zero output

When this is working, document the command sequence, hardware pins, IMU orientation, network settings, and a short video in your README. That helps someone understand what you built and how you brought it to life!

## Common Bringup Symptoms

| Symptom | Check first | Likely fix |
| --- | --- | --- |
| `ros2 launch` cannot find your launch file | `ros2 launch "$PACKAGE_NAME" bringup.launch.py --show-args` | Install `launch/` through `setup.py` `data_files`, rebuild, and source `install/setup.bash`. |
| Robot moves on startup | Motor power cutoff and launch output | Command zero before enabling outputs and initialize the driver to zero. |
| Single `/cmd_vel` keeps motors running | Watchdog timeout | Store the last command time and command zero when it goes stale. |
| IMU topic never appears | `i2cdetect -y 1` | Fix power, ground, SDA, SCL, address, or the Python I2C dependency. |
| IMU values move on the wrong axis | Your mounting sketch | Correct the axis mapping once; do not also rotate it again in TF. |
| RViz has no fixed frame | RViz Fixed Frame | Use `odom`, not `map`, unless you later add real localization. |
| Computer cannot see Pi topics | Two-way network test | Match `ROS_DOMAIN_ID`, disable localhost-only mode, check WSL mirrored networking, and test both directions. |
| Robot ignores teleop | `/cmd_vel` publisher and subscriber counts | Confirm teleop publishes in the same domain and your motor node subscribes to the same resolved topic. |
