---
title: Put Your Package on a Robot
description: Move your own ROS 2 package from development computer to real Waypoint hardware.
---

Come here after your package is in your GitHub repository and your Waypoint hardware has arrived. This is the handoff from code you understand to the physical robot you designed.

## 1. Prepare the Raspberry Pi

Flash **Ubuntu Server 24.04 LTS, 64-bit** to the Raspberry Pi Zero 2 W with Raspberry Pi Imager. Ubuntu lists the Zero 2 W as supported for Ubuntu Server; use Server, not Desktop, because the small Pi does not need to render RViz. Follow Ubuntu's [Raspberry Pi installation guide](https://ubuntu.com/tutorials/how-to-install-ubuntu-on-your-raspberry-pi) for Imager and first-boot details.

During Imager setup, choose a username, password, Wi-Fi network, and hostname you will remember. Boot the Pi, then connect over SSH from an Ubuntu terminal:

```bash title="Computer terminal"
ssh <pi_username>@<pi_hostname_or_ip>
```

Install the ROS 2 repository and base tools by following [Set Up Ubuntu for ROS 2](/reference/set-up-ubuntu-for-ros/) on the Pi, choosing the **robot** package list instead of the desktop list. Then install the packages your physical interfaces need:

```bash title="Raspberry Pi terminal"
sudo apt update
sudo apt install -y python3-gpiozero python3-lgpio python3-smbus i2c-tools
```

## 2. Enable and Check I2C

Your IMU needs the Pi's I2C bus enabled. Add `dtparam=i2c_arm=on` to `/boot/firmware/config.txt`, reboot, then reconnect over SSH. With the IMU wired and powered, scan the bus:

```bash title="Raspberry Pi terminal"
i2cdetect -y 1
```

You should see the address your IMU uses, often `68` or `69` for an MPU6050. If no address appears, stop and check power, ground, SDA, SCL, and the board's address pin before blaming ROS.

## 3. Bring Your Own Package Over

Clone your repository into a workspace on the Pi. Keep the same workspace and package names you used while developing, but do not assume that a path from your laptop exists on the robot.

```bash title="Raspberry Pi terminal"
mkdir -p ~/<workspace_name>/src
cd ~/<workspace_name>/src
git clone <your_repository_url>
cd ~/<workspace_name>
source /opt/ros/jazzy/setup.bash
rosdep install -i --from-paths src --rosdistro jazzy -y
colcon build --symlink-install
source install/setup.bash
```

If `rosdep` reports a missing system dependency, add the correct dependency to `package.xml` only after you know which node needs it. Do not fix a build by randomly adding every ROS package you can find.

## 4. Start Your Bringup Launch File

Create a bringup launch file for your robot. It should start the nodes you made, not a pile of visual extras:

1. your motor node
2. your IMU node
3. your open-loop odometry node
4. a static `map -> odom` transform
5. `robot_state_publisher` only if you completed the optional robot-model polish

Pass your configuration YAML to the hardware nodes. Keep the initial motor-output parameter low and easy to override from the launch command.

:::caution[Real motors]
Before starting the motor node for the first time, put the robot on a stand so the wheels cannot drive across the room. Tell nearby people the robot may move. Be ready to cut motor power.
:::

Once bringup starts, use [Verify Your Robot Data](/reference/verify-your-robot/) for the IMU, motor-direction, dead-reckoning, TF, teleop, and optional RViz checks.
## 5. Connect Your Computer

Put the computer and robot on the same network. Follow [Connect Your Computer to a ROS 2 Robot](/reference/connect-to-a-ros2-robot/) before launching RViz or teleop from the computer. On Windows, run those commands inside Ubuntu WSL, not PowerShell.

On the computer, source your local workspace before running tools. Then use normal ROS commands to see what the Pi is publishing:

```bash title="Computer Ubuntu terminal"
source /opt/ros/jazzy/setup.bash
source ~/<workspace_name>/install/setup.bash
ros2 topic list
```

Start `rviz2`, use `map` as the fixed frame, and add the minimal displays from [See it in RViz](/guides/ros2-package-guide/rviz/). Drive first with `teleop_twist_keyboard` or use the optional [event-based keyboard teleop](/reference/keyboard-teleop/) after you understand the standard path.

## 6. Run Your Autonomous Routine Last

Only after manual movement, IMU, odometry, TF, and RViz all behave individually should you start the autonomous node you wrote. Begin with low speeds and a short routine. Watch the robot and `/cmd_vel`; stop immediately if its real behavior differs from your planned table.

When this is working, document the command sequence, hardware pins, IMU orientation, and a short video in your README. That is how someone else can understand what you built and how you brought it to life.


