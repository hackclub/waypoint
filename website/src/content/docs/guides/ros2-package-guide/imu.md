---
title: Publish IMU Data
description: Add the required IMU node to your Waypoint package.
---

Every Waypoint robot will include an IMU. Add a node that reads the physical sensor over I2C and publishes `sensor_msgs/msg/Imu` on `imu/data_raw`. In CLI tools you will usually see that resolved as `/imu/data_raw`.

## Use the ROS IMU Message Correctly

An `Imu` message contains three types of measurement:

| Field | Data | Unit |
| --- | --- | --- |
| `linear_acceleration` | accelerometer axes, including gravity | meters per second squared |
| `angular_velocity` | gyroscope axes | radians per second |
| `orientation` | a real fused attitude estimate, when you have one | quaternion |

The MPU6050 gives you accelerometer and gyroscope data. It does not produce a fused orientation by itself. For `/imu/data_raw`, publish acceleration and angular velocity, set `orientation_covariance[0] = -1.0`, and do not pretend the robot knows its orientation.

Read the official [`Imu` message definition](https://docs.ros.org/en/jazzy/p/sensor_msgs/msg/Imu.html) before you write the publisher.

## Decide How the Sensor Sits in the Robot

ROS uses the [REP 103](https://www.ros.org/reps/rep-0103.html) robot convention: x forward, y left, z up. Draw the IMU orientation in your chassis notes and make your published axes match that convention.

Store the I2C bus, device address, accelerometer range, gyroscope range, publish rate, bias values, and frame name as parameters. The IMU node should convert raw signed register values into ROS units before publishing them.

## Build the Node

Create an IMU node with this sequence:

1. Open the Pi's I2C bus and confirm the configured device responds.
2. Read an identity or configuration register so wiring problems produce a clear error.
3. Configure the sensor ranges you chose.
4. Read the three acceleration axes and three gyro axes at a steady rate.
5. Convert the signed raw values to meters per second squared and radians per second.
6. Subtract the bias values you measured while the robot was still.
7. Populate the message header with the current ROS clock and the frame you selected.
8. Publish `imu/data_raw`.
9. Close the I2C handle cleanly when the node shuts down.

Keep the register reads and scale conversions in small functions. The [MPU-6000/MPU-6050 register map](https://invensense.tdk.com/wp-content/uploads/2015/02/MPU-6000-Register-Map1.pdf) is the source for the device configuration and conversions; the ROS message documentation is the source for the data you publish.

## Build and Inspect

Add an executable entry for the IMU node and add it to the same bringup launch file as movement. Include its configuration YAML alongside the motor and odometry settings.

```bash title="Ubuntu terminal"
WORKSPACE_NAME="cool_rover_ws"
PACKAGE_NAME="cool_rover"

cd ~/"$WORKSPACE_NAME"
source /opt/ros/jazzy/setup.bash
colcon build --symlink-install
source install/setup.bash
ros2 pkg executables "$PACKAGE_NAME"
ros2 launch "$PACKAGE_NAME" bringup.launch.py --show-args
```

Expected result: ROS can find your IMU executable and the bringup launch file without using a path into `src/`.

The real I2C scan, stationary readings, axis checks, covariance check, and publish-rate check happen during [Put Your Package on a Robot](/guides/robot-bringup/).

Continue to [Add teleop and autonomy](/guides/ros2-package-guide/autonomy/).
