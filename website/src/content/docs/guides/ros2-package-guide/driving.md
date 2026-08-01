---
title: Build Movement Nodes
description: Implement the motor and open-loop odometry nodes for the shared Waypoint robot hardware.
---

This step gives the package its movement backbone. All Waypoint kits use the same differential-drive hardware and do not have wheel encoders, so your package needs two related nodes:

- a motor node that subscribes to `/cmd_vel` and controls the real motor driver
- an odometry node that subscribes to `/cmd_vel` and publishes open-loop dead reckoning

Both nodes use the same command stream. Keep their responsibilities separate.

## Use the Standard Movement Topic

Subscribe to `/cmd_vel` using `geometry_msgs/msg/Twist`. For this robot:

| Field | Meaning | Unit |
| --- | --- | --- |
| `linear.x` | forward or reverse request | meters per second |
| `angular.z` | counter-clockwise or clockwise turn request | radians per second |

Teleop and your autonomous node can now use the same interface. Read the [`Twist` message definition](https://docs.ros.org/en/jazzy/p/geometry_msgs/msg/Twist.html) and the official [Python publisher/subscriber tutorial](https://docs.ros.org/en/jazzy/Tutorials/Beginner-Client-Libraries/Writing-A-Simple-Py-Publisher-And-Subscriber.html) before writing the subscription.

## Write the Motor Node

Create a node such as `motor_driver.py`. Its callback receives `linear.x` and `angular.z`, mixes them into left and right drive requests, then sends the result to the motor driver connected to the Pi GPIO pins.

For differential drive, the starting relationship is:

```text
left request  = forward request - turn gain * turn request
right request = forward request + turn gain * turn request
```

Your node should clamp the requests to the safe range your driver accepts. Put hardware-specific values in `config/`: GPIO or channel numbers, left/right inversion, output limit, deadband, and a command timeout.

Add a watchdog timer. If `/cmd_vel` stops arriving, the node must command both sides to zero. Keep shutdown code that also stops the driver. This is part of the node's job, not a separate feature.

Use the [OrphBot example package](https://github.com/SharKingStudios/orphbot-package) to study a small Waypoint-style implementation. For a larger example of a motor command path, trace the movement nodes in [Terralift](https://github.com/SharKingStudios/Terralift). Write the node for the hardware and names in your own project.

## Write Open-Loop Odometry

Create a separate node such as `open_loop_odom.py`. It receives the same `/cmd_vel` message and integrates the commanded linear and angular velocity over elapsed time. This is dead reckoning: it estimates the robot pose from the commands sent to the real robot.

Keep a pose `(x, y, yaw)` and update it with elapsed time `dt`:

```text
x   += linear_velocity * cos(yaw) * dt
y   += linear_velocity * sin(yaw) * dt
yaw += angular_velocity * dt
```

Publish the resulting pose as `nav_msgs/msg/Odometry` on `/odom`, publish the `odom -> base_link` transform, and append poses to a bounded `nav_msgs/msg/Path` on `/path`. Add a static `map -> odom` transform in your later bringup launch file so RViz has a fixed origin.

Document that this package uses open-loop dead reckoning because the kit has no wheel encoders. Tune the linear and angular scale values later from real movement, and keep those scales in configuration instead of changing the integration logic.

## Put the Nodes in Bringup

Create a launch file that starts the motor and odometry nodes with the configuration YAML you made. This is the package-level entry point you will extend with the IMU and autonomous routine.

At this point, your source package should contain the movement nodes, their executable entries, the configuration they need, and a bringup launch file. Continue to [Publish IMU data](/guides/ros2-package-guide/imu/).
