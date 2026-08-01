---
title: Understand Messages, Parameters, and Launch Files
description: Learn the Python, ROS, YAML, and launch syntax used by the robot package.
---

This page teaches the small pieces of syntax the rest of the package keeps using. The goal is not to become a Python expert. The goal is to stop guessing when you see `message.pose.pose`, `ros__parameters`, or a launch `Node(...)`.

## Python Values You Will Use

| Python type | Example in this project | What it means |
| --- | --- | --- |
| `float` | `0.18` | a decimal number, such as meters per second |
| `int` | `5` | a whole number, such as a BCM GPIO pin |
| `bool` | `False` | true or false |
| `str` | `'imu_link'` | text |
| `list` | `[5, 6]` | ordered values you can index |
| tuple | `(1.0, 0.12, 0.0)` | ordered values you usually do not change |
| object | `Twist()` | a value made from a class, with fields and methods |
| `None` | `last_command = None` | no value has arrived yet |

A Python class is a blueprint. Calling it creates an object. ROS message classes work this way: `Twist()` creates one Twist message object, and then you fill fields such as `message.linear.x`.

## Read ROS Interface Syntax

Run this again:

```bash title="Ubuntu terminal"
source /opt/ros/jazzy/setup.bash
ros2 interface show geometry_msgs/msg/Twist
```

ROS interface definitions use a compact syntax:

| Syntax | Meaning |
| --- | --- |
| `float64` | a decimal numeric value |
| `string` | text |
| `float64[9]` | exactly nine decimal values |
| `geometry_msgs/Vector3` | another message nested inside this message |
| `geometry_msgs/PoseStamped[]` | a list that can grow or shrink |

A message can contain other messages. That is why you will write fields like this:

```python title="Python message field"
message = Twist()
message.linear.x = 0.10
```

That means:

```text title="Twist field tree"
Twist object
+-- linear: Vector3 object
|   +-- x: float64 field
+-- angular: Vector3 object
```

Unused numeric fields normally begin at zero, but defaults are not a substitute for understanding. For example, leaving `linear.y` at zero is correct for this robot; leaving an IMU orientation quaternion all zero is not correct.

## Use a Message-Reading Method

When a new message appears in this guide:

1. Run `ros2 interface show MESSAGE_TYPE`.
2. Draw or read the field tree.
3. Identify the fields this robot uses.
4. Find the required units.
5. Set `header.stamp` and `header.frame_id` if the message has a header.
6. Construct one message in Python.
7. Compare your result with `ros2 topic echo`.

The [ROS 2 message types reference](/reference/ros2-message-types/) keeps the main message trees in one place for later lookup.

## Write Parameter YAML

Parameters are named settings loaded by a node. They let you move robot-specific values out of Python code. Here is a starter `config/robot.yaml` for the example package:

```yaml title="config/robot.yaml"
motor_driver:
  ros__parameters:
    max_output: 0.30
    deadband: 0.04
    command_timeout_s: 0.50
    wheel_separation_m: 0.13
    approximate_max_wheel_speed_mps: 0.40
    left_front_pins: [5, 6]
    left_rear_pins: [13, 19]
    right_front_pins: [20, 21]
    right_rear_pins: [23, 24]
    invert_left: false
    invert_right: false

open_loop_odom:
  ros__parameters:
    odom_frame: odom
    base_frame: base_link
    publish_rate_hz: 10.0
    linear_scale: 1.0
    angular_scale: 1.0
    path_max_poses: 500
    command_timeout_s: 0.55

imu_node:
  ros__parameters:
    bus: 1
    address: 104
    frame_id: imu_link
    publish_rate_hz: 20.0
    gyro_bias_x_rad_s: 0.0
    gyro_bias_y_rad_s: 0.0
    gyro_bias_z_rad_s: 0.0

simple_auton:
  ros__parameters:
    forward_speed_mps: 0.10
    turn_speed_rad_s: 0.35
    start_delay_s: 1.0
```

The outer keys, such as `motor_driver`, must match the node names used in launch. `ros__parameters` is a required ROS 2 key. YAML booleans are lowercase `true` and `false`. Lists use square brackets when they are short.

The pin numbers above are OrphBot-style examples. Your final values come from your PCB and wiring notes. The IMU address `104` is decimal for `0x68`; `i2cdetect` usually displays I2C addresses in hexadecimal.

## Load and Inspect Parameters

Inside a node, declare a parameter before reading it:

```python title="Parameter pattern"
self.declare_parameter('max_output', 0.30)
self.max_output = float(self.get_parameter('max_output').value)
```

After launch, inspect loaded parameters:

```bash title="Ubuntu terminal"
ros2 param list /motor_driver
ros2 param get /motor_driver max_output
```

If a parameter still has the default value, check the YAML filename, indentation, outer node key, launch file, and whether you rebuilt after changing installed assets.

## Write a Bringup Launch File

A launch file starts several nodes with one command. Create `launch/bringup.launch.py` inside your package. This example starts the three required robot nodes with `config/robot.yaml`.

```python title="launch/bringup.launch.py"
from ament_index_python.packages import get_package_share_directory
from launch import LaunchDescription
from launch_ros.actions import Node
import os


package_name = 'cool_rover'


def generate_launch_description():
    package_share = get_package_share_directory(package_name)
    config_path = os.path.join(package_share, 'config', 'robot.yaml')

    return LaunchDescription([
        Node(
            package=package_name,
            executable='motor_driver',
            name='motor_driver',
            output='screen',
            parameters=[config_path],
        ),
        Node(
            package=package_name,
            executable='open_loop_odom',
            name='open_loop_odom',
            output='screen',
            parameters=[config_path],
        ),
        Node(
            package=package_name,
            executable='imu_node',
            name='imu_node',
            output='screen',
            parameters=[config_path],
        ),
    ])
```

The launch file uses the package share directory, so it will work on your computer and on the Raspberry Pi after `setup.py` installs `launch/` and `config/`.

You will need these package dependencies once you use launch files and package-share lookup:

```xml title="package.xml excerpt"
<exec_depend>ament_index_python</exec_depend>
<exec_depend>launch</exec_depend>
<exec_depend>launch_ros</exec_depend>
```

Build and check the launch file:

```bash title="Ubuntu terminal"
WORKSPACE_NAME="cool_rover_ws"
PACKAGE_NAME="cool_rover"

cd ~/"$WORKSPACE_NAME"
source /opt/ros/jazzy/setup.bash
colcon build --symlink-install
source install/setup.bash
ros2 launch "$PACKAGE_NAME" bringup.launch.py --show-args
```

Expected result: ROS finds the launch file from `install/`. You may still see runtime errors if hardware nodes are not ready for your computer yet; that is different from launch-file discovery.

Do not add a static `map -> odom` transform for this project. The local odometry frame is `odom`.

Next: [Build movement nodes](/guides/ros2-package-guide/driving/).