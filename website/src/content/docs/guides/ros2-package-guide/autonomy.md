---
title: Add Teleop and Autonomy
description: Make your package compatible with normal ROS teleop and add a small routine of your own.
---

Your motor node already accepts `cmd_vel`, so it can work with normal ROS teleop messages. In this page you will also add your own autonomous node that publishes `Twist` commands.

Teleop and autonomy both ask for movement. They should not publish at the same time unless you deliberately add a command arbiter or mux.

## Use Standard Teleop First

The standard keyboard teleop package is the required first teleop tool because it is widely used and publishes plain `geometry_msgs/msg/Twist` messages. It proves your robot package speaks the normal ROS movement interface.

Install it on the computer that will drive the robot:

```bash title="Computer Ubuntu terminal"
sudo apt update
sudo apt install -y ros-jazzy-teleop-twist-keyboard
source /opt/ros/jazzy/setup.bash
ros2 run teleop_twist_keyboard teleop_twist_keyboard \
  --ros-args \
  -p key_timeout:=0.6
```

Terminal keyboard input depends on your terminal's key-repeat behavior. `key_timeout` stops a stale held command after keyboard input stops, and the motor node's watchdog remains the final safety fallback. You do not need to write a custom teleop node for your submission; if you want actual key-press and key-release events later, use the optional [event-based keyboard teleop extra](/extras/event-based-keyboard-teleop/) after standard teleop works.

## Design Your Autonomous Routine

Autonomy for this guide is intentionally small: publish a sequence of `Twist` commands with safe speeds and stops between segments. Choose the route, names, speeds, durations, and purpose yourself.

Start with a table in your README or notes:

| Segment | Linear x | Angular z | Duration | Why |
| --- | --- | --- | --- | --- |
| settle | `0.00 m/s` | `0.00 rad/s` | `1.0 s` | prove startup zero |
| forward_1 | your value | `0.00 rad/s` | your value | first move |
| stop_1 | `0.00 m/s` | `0.00 rad/s` | `0.5 s` | separate commands |
| turn_1 | `0.00 m/s` | your value | your value | change heading |
| stop_2 | `0.00 m/s` | `0.00 rad/s` | `0.5 s` | pause before next move |

Your choices should stay inside the speed limits you tested on the stand. Save the adventurous route for after the boring checks pass.

## Create the Node

Create `cool_rover/cool_rover/simple_auton.py` and add an executable entry:

```python title="setup.py excerpt"
'simple_auton = cool_rover.simple_auton:main',
```

Use a timer rather than `time.sleep()`. A sleeping callback cannot respond cleanly to shutdown.

```python title="simple_auton.py starter"
import math

from geometry_msgs.msg import Twist
import rclpy
from rclpy.node import Node


class SimpleAuton(Node):
    def __init__(self):
        super().__init__('simple_auton')
        self.declare_parameter('forward_speed_mps', 0.10)
        self.declare_parameter('turn_speed_rad_s', 0.35)
        self.declare_parameter('start_delay_s', 1.0)
        self.declare_parameter('first_forward_s', 1.0)
        self.declare_parameter('turn_s', 0.8)
        self.declare_parameter('second_forward_s', 1.0)
        self.declare_parameter('stop_s', 0.5)

        forward = self.read_speed('forward_speed_mps')
        turn = self.read_speed('turn_speed_rad_s')
        delay = self.read_duration('start_delay_s')
        first = self.read_duration('first_forward_s')
        turn_time = self.read_duration('turn_s')
        second = self.read_duration('second_forward_s')
        stop = self.read_duration('stop_s')

        self.segments = [
            ('settle', delay, 0.0, 0.0),
            ('forward_1', first, forward, 0.0),
            ('stop_1', stop, 0.0, 0.0),
            ('turn_1', turn_time, 0.0, turn),
            ('stop_2', stop, 0.0, 0.0),
            ('forward_2', second, forward, 0.0),
            ('done_stop', stop, 0.0, 0.0),
        ]
        self.segment_index = 0
        self.segment_start = self.get_clock().now()
        self.publisher = self.create_publisher(Twist, 'cmd_vel', 10)
        self.timer = self.create_timer(0.05, self.tick)
        self.publish_motion(0.0, 0.0)
        self.get_logger().info('Simple autonomous routine armed')
```

The tuple shape is `(name, duration_seconds, linear_x_mps, angular_z_rad_s)`.

Validate durations and speeds separately before using them. Durations cannot be negative. Speeds only need to be finite here, because a negative `turn_speed_rad_s` is a valid way to turn the other direction.

```python title="Parameter validation"
def read_duration(self, name: str) -> float:
    value = float(self.get_parameter(name).value)
    if not math.isfinite(value) or value < 0.0:
        raise ValueError(f'{name} must be finite and nonnegative')
    return value


def read_speed(self, name: str) -> float:
    value = float(self.get_parameter(name).value)
    if not math.isfinite(value):
        raise ValueError(f'{name} must be finite')
    return value
```

For speed parameters, also check against the safe ranges you chose for your robot. For example, you might reject forward speeds above `0.20 m/s` until floor testing is done.

## Publish Each Segment

```python title="Autonomy timer"
def tick(self) -> None:
    if self.segment_index >= len(self.segments):
        self.publish_motion(0.0, 0.0)
        self.timer.cancel()
        self.get_logger().info('Simple autonomous routine complete')
        return

    name, duration_s, linear_mps, angular_rad_s = self.segments[self.segment_index]
    elapsed_s = (self.get_clock().now() - self.segment_start).nanoseconds / 1e9

    if elapsed_s >= duration_s:
        self.segment_index += 1
        self.segment_start = self.get_clock().now()
        self.publish_motion(0.0, 0.0)
        return

    self.publish_motion(linear_mps, angular_rad_s)
```

When the routine is done, canceling the timer stops this node from sending new timed commands. The node itself stays in the ROS graph until the launch process stops, so after `Simple autonomous routine complete` appears, press `Ctrl+C` before starting teleop or running autonomy again. The final zero command and the motor watchdog still provide the movement stop.

And the publisher method:

```python title="Autonomy Twist publisher"
def publish_motion(self, linear_mps: float, angular_rad_s: float) -> None:
    message = Twist()
    message.linear.x = linear_mps
    message.angular.z = angular_rad_s
    self.publisher.publish(message)
```

The node must publish zero:

- before the first movement segment
- between movement segments
- after the last segment
- when it receives `Ctrl+C`

```python title="Autonomy main"
def main(args=None):
    rclpy.init(args=args)
    node = SimpleAuton()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        node.publish_motion(0.0, 0.0)
    finally:
        node.publish_motion(0.0, 0.0)
        node.destroy_node()
        if rclpy.ok():
            rclpy.shutdown()
```

OrphBot's `simple_auton.py` is useful for studying the timer-driven segment idea. Your segment names, speeds, durations, and route should be yours.

## Launch Autonomy Separately

Keep normal bringup and autonomy as separate launch entry points unless you intentionally add a command arbiter. One safe pattern is:

- `bringup.launch.py` starts motor, odometry, IMU, and fixed transforms
- `auton.launch.py` includes bringup and then starts `simple_auton`
- you do not run standard teleop at the same time as `simple_auton`

Create `cool_rover/launch/auton.launch.py`:

```python title="launch/auton.launch.py"
from ament_index_python.packages import get_package_share_directory
from launch import LaunchDescription
from launch.actions import IncludeLaunchDescription
from launch.launch_description_sources import PythonLaunchDescriptionSource
from launch_ros.actions import Node
import os


def generate_launch_description():
    package_share = get_package_share_directory('cool_rover')
    bringup_launch = os.path.join(
        package_share,
        'launch',
        'bringup.launch.py',
    )
    config_file = os.path.join(
        package_share,
        'config',
        'robot.yaml',
    )

    return LaunchDescription([
        IncludeLaunchDescription(
            PythonLaunchDescriptionSource(bringup_launch),
        ),
        Node(
            package='cool_rover',
            executable='simple_auton',
            name='simple_auton',
            parameters=[config_file],
            output='screen',
        ),
    ])
```

`IncludeLaunchDescription` starts another launch file from this one. `PythonLaunchDescriptionSource` tells ROS that the included file is a Python launch file. Including normal bringup keeps you from copying the motor, odometry, IMU, and transform nodes into a second file and accidentally letting the two launch files drift apart.

Run autonomy with one launch command. Do not start `bringup.launch.py` separately first; `auton.launch.py` already includes it. Do not run keyboard teleop at the same time.

```bash title="Raspberry Pi SSH terminal"
WORKSPACE_NAME="cool_rover_ws"
PACKAGE_NAME="cool_rover"

cd ~/"$WORKSPACE_NAME"
source /opt/ros/jazzy/setup.bash
source install/setup.bash

ros2 launch "$PACKAGE_NAME" auton.launch.py
```

With `auton.launch.py` running, check publisher count from a second sourced terminal:

```bash title="Second Raspberry Pi SSH terminal"
ros2 topic info /cmd_vel --verbose
```

Expected result during normal autonomous driving: one command publisher, your `simple_auton` node, and the motor/odometry subscribers.

## Build and Check

```bash title="Ubuntu terminal"
WORKSPACE_NAME="cool_rover_ws"
PACKAGE_NAME="cool_rover"

cd ~/"$WORKSPACE_NAME"
source /opt/ros/jazzy/setup.bash
colcon build --symlink-install
source install/setup.bash
ros2 pkg executables "$PACKAGE_NAME"
ros2 launch "$PACKAGE_NAME" auton.launch.py --show-args
```

Expected result: the executable list includes `simple_auton`, and ROS can find `auton.launch.py` from the installed package.

With teleop compatibility and your autonomous node in place, finish with [Polishing your package](/guides/ros2-package-guide/polish/).
