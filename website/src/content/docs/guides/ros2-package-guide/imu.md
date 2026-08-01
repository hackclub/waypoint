---
title: Publish IMU Data
description: Add the required IMU node to your Waypoint package.
---

Every Waypoint robot includes an IMU. Add a node that reads the physical sensor over I2C and publishes `sensor_msgs/msg/Imu` on `/imu/data_raw`.

## Use the ROS IMU Message Correctly

An `Imu` message contains three types of measurement:

| Field | Data | Unit |
| --- | --- | --- |
| `linear_acceleration` | accelerometer axes, including gravity | meters per second squared |
| `angular_velocity` | gyroscope axes | radians per second |
| `orientation` | a real fused attitude estimate, when you have one | quaternion |

The MPU6050 gives you accelerometer and gyroscope data. For `/imu/data_raw`, publish those readings. Do not fill in an invented orientation. ROS uses `orientation_covariance[0] = -1` to mark orientation unavailable. Read the official [`Imu` message definition](https://docs.ros.org/en/jazzy/p/sensor_msgs/msg/Imu.html) before you write the publisher.

## Decide How the Sensor Sits in the Robot

ROS uses the [REP 103](https://www.ros.org/reps/rep-0103.html) robot convention: x forward, y left, z up. Draw the IMU orientation in your chassis notes and make your published axes match that convention.

Store the I2C bus, device address, accelerometer range, gyroscope range, publish rate, and frame name as parameters. The IMU node should convert its raw register values into ROS units before publishing them.

## Build the Node

Create an IMU node with this sequence:

1. Open the Pi's I2C bus and confirm the configured device responds.
2. Configure the sensor ranges you chose.
3. Read the three acceleration axes and three gyro axes at a steady rate.
4. Convert the values to meters per second squared and radians per second.
5. Populate the message header with the current ROS clock and the frame you selected.
6. Publish `/imu/data_raw`.
7. Close the I2C handle cleanly when the node shuts down.

Keep the register reads and scale conversions in small functions. The [MPU-6000/MPU-6050 register map](https://invensense.tdk.com/wp-content/uploads/2015/02/MPU-6000-Register-Map1.pdf) is the source for the device configuration and conversions; the ROS message documentation is the source for the data you publish.

## Add It to Bringup

Add an executable entry for the IMU node and add it to the same bringup launch file as movement. Include its configuration YAML alongside the motor and odometry settings.

The post-kit [Verify Your Robot Data](/reference/verify-your-robot/) reference covers the I2C and message checks. For this package milestone, make sure the source code, parameters, and launch entry are present and clear.

Continue to [Add teleop and autonomy](/guides/ros2-package-guide/autonomy/).
