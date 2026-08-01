---
title: Build Movement Nodes
description: Implement the motor and open-loop odometry nodes for the shared Waypoint robot hardware.
---

This step gives the package its movement backbone. You will build two related nodes:

- a motor node that subscribes to `cmd_vel` and controls the real motor driver
- an odometry node that estimates motion and publishes `/odom`, `/path`, and `odom -> base_link`

Both nodes use the same command stream. Keep their responsibilities separate. The motor node drives hardware, while the odometry node publishes a command-based estimate.

## Use the Standard Movement Topic

Subscribe to `cmd_vel` using `geometry_msgs/msg/Twist`. In CLI tools you will usually see that resolved as `/cmd_vel`.

| Field | Meaning | Unit |
| --- | --- | --- |
| `linear.x` | forward or reverse request | meters per second |
| `angular.z` | counter-clockwise or clockwise turn request | radians per second |

Teleop and your autonomous node can now use the same interface. Read the [`Twist` message definition](https://docs.ros.org/en/jazzy/p/geometry_msgs/msg/Twist.html) and the official [Python publisher/subscriber tutorial](https://docs.ros.org/en/jazzy/Tutorials/Beginner-Client-Libraries/Writing-A-Simple-Py-Publisher-And-Subscriber.html) before writing the subscription.

## Write the Motor Node

Create a node such as `motor_driver.py`. Its callback receives `linear.x` and `angular.z`, converts them into left and right wheel requests, then converts those wheel requests into the output range your motor driver accepts.

For differential drive, keep the physical conversion dimensionally correct:

```text
left wheel speed  = linear.x - angular.z * wheel_separation / 2
right wheel speed = linear.x + angular.z * wheel_separation / 2
```

Those values are wheel-speed requests in meters per second. They are not PWM yet. Convert them to driver output in a separate step using a speed scale you measured or chose conservatively:

```text
left output  = left wheel speed / approximate_max_wheel_speed
right output = right wheel speed / approximate_max_wheel_speed
```

:::tip[Note]
You can take a guess on the wheel speed for now. When you get the robot you will want to measure this to make your odometry more accurate!
:::

Then apply deadband, inversion, and output limits. Put hardware-specific values in `config/`: GPIO or channel numbers, left/right inversion, output limit, deadband, wheel separation, approximate speed scale, and a command timeout.

Your motor node must fail safely:

- command zero on startup before enabling outputs
- reject `NaN`, infinite, or out-of-range parameters
- clamp output to the configured safe range
- command zero when `/cmd_vel` goes stale
- command zero during shutdown and exceptions

Add a watchdog timer. If `/cmd_vel` stops arriving after the configured timeout, the node must command both sides to zero. This is part of the node's job, not a separate feature.

Use the [OrphBot example package](https://github.com/SharKingStudios/orphbot-package) only as a guided project tour. Look at which topic its motor node subscribes to and where its hardware choices live, then write the version for your own wiring, pins, and limits.

## Write Open-Loop Odometry

Create a separate node such as `open_loop_odom.py`. It receives the same `cmd_vel` message and integrates the requested or applied linear and angular velocity over elapsed time. This is dead reckoning: it estimates robot pose from commands, not measured wheel movement.

Keep a pose `(x, y, yaw)` and update it with actual elapsed time `dt`:

```text
x   += linear_velocity * cos(yaw) * dt
y   += linear_velocity * sin(yaw) * dt
yaw += angular_velocity * dt
```

Publish the result as:

| Interface | Message or transform | Frame rule |
| --- | --- | --- |
| `/odom` | `nav_msgs/msg/Odometry` | `header.frame_id` is `odom`, `child_frame_id` is `base_link` |
| `/path` | `nav_msgs/msg/Path` | `header.frame_id` is `odom` |
| TF | `odom -> base_link` | same pose as `/odom` |

Use a valid quaternion for yaw. Do not leave quaternion fields all zero.

Keep the path bounded so RViz does not grow forever during a long session. For example, store only the most recent few hundred poses.

## Build and Inspect

Add executable entries for both movement nodes, then build from the workspace root:

```bash title="Ubuntu terminal"
WORKSPACE_NAME="cool_rover_ws"
PACKAGE_NAME="cool_rover"

cd ~/"$WORKSPACE_NAME"
source /opt/ros/jazzy/setup.bash
colcon build --symlink-install
source install/setup.bash
ros2 pkg executables "$PACKAGE_NAME"
```

Expected result: the executable list includes your motor node and odometry node commands.

You can inspect the ROS interfaces on the computer before physical bringup, but do not pretend that open-loop odometry proves real travel. The physical checks happen later in [Put Your Package on a Robot](/guides/robot-bringup/).

## Put the Nodes in Bringup

Create a launch file that starts the motor and odometry nodes with the configuration YAML you made. This is the package-level entry point you will extend with the IMU and autonomous routine.

At this point, your source package should contain the movement nodes, their executable entries, the configuration they need, and a bringup launch file. Continue to [Publish IMU data](/guides/ros2-package-guide/imu/).
