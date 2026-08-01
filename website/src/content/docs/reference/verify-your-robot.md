---
title: Verify Your Robot Data
description: Check movement, IMU data, dead reckoning, transforms, and optional RViz after your Waypoint kit is assembled.
---

Use this reference after [Put Your Package on a Robot](/guides/robot-bringup/) has started your bringup launch file. Work through one row at a time. Do not start teleop or autonomy until the lower-level rows make sense.

:::caution[Real hardware]
For motor checks, put the robot on a stand, start with a low output limit, and keep a way to cut motor power nearby.
:::

## Check the ROS Graph

On the Raspberry Pi, source the workspace and inspect what is running:

```bash title="Raspberry Pi terminal"
source /opt/ros/jazzy/setup.bash
source ~/<workspace_name>/install/setup.bash
ros2 node list
ros2 topic list
```

You should find your motor, IMU, and odometry nodes, plus `/cmd_vel`, `/imu/data_raw`, `/odom`, `/path`, `/tf`, and `/tf_static` where appropriate. If a node is absent, read its launch-file output before changing code.

## Check the IMU First

```bash title="Raspberry Pi terminal"
ros2 topic echo /imu/data_raw --once
```

Make sure the message has a current timestamp and that acceleration and angular-velocity fields contain changing real values. Leave the robot still, then gently rotate it by hand. A still gyro should sit near zero after calibration; turning the robot should change the matching gyro axis. If the message never arrives, use `i2cdetect -y 1` and inspect the I2C wiring and configured address.

## Check Each Motor Direction

Use a brief low-speed command. The motor watchdog should stop motion shortly after this single message:

```bash title="Raspberry Pi terminal"
ros2 topic pub -1 /cmd_vel geometry_msgs/msg/Twist "{linear: {x: 0.10}, angular: {z: 0.0}}"
```

Then try a small turn request:

```bash title="Raspberry Pi terminal"
ros2 topic pub -1 /cmd_vel geometry_msgs/msg/Twist "{linear: {x: 0.0}, angular: {z: 0.30}}"
```

If a side turns the wrong way, correct the named inversion value for that side. If a motor only turns one direction, inspect that driver's two direction inputs, the physical wiring, and the motor-driver channel before changing the ROS mixing math.

## Check Dead Reckoning and TF

With movement commands arriving, inspect the messages your open-loop odometry node produces:

```bash title="Raspberry Pi terminal"
ros2 topic echo /odom --once
ros2 topic echo /path --once
ros2 run tf2_ros tf2_echo odom base_link
```

The pose and path should update from your commanded movement, and `tf2_echo` should show the changing body transform. The path will drift because the kit has no wheel encoders. Tune the linear and angular scale parameters from observed motion, keeping the dead-reckoning code itself simple.

## Check From the Driving Computer

After [connecting the computer and Pi](/reference/connect-to-a-ros2-robot/), use standard teleop first:

```bash title="Computer Ubuntu terminal"
ros2 run teleop_twist_keyboard teleop_twist_keyboard
```

Confirm that releasing the teleop key stops the robot. Then run your autonomous routine by the command or launch file you created and watch its `/cmd_vel` messages in another terminal.

## Optional RViz

Start RViz on the computer, choose `map` as the Fixed Frame, and add a Grid, Path (`/path`), and Axes (`base_link`). Add RobotModel only if you completed the optional [Robot Models in RViz](/reference/robot-models-in-rviz/) polish step.

Keep the view minimal. It should help you see the robot's origin, body direction, and path rather than pretend it has a detailed simulation.
