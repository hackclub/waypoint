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
ros2 run teleop_twist_keyboard teleop_twist_keyboard
```

You do not need to write a custom teleop node for your submission. If terminal key repeat feels bad on your system later, use the optional [event-based keyboard teleop extra](/extras/event-based-keyboard-teleop/) after standard teleop works.

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

        forward = self.safe_float('forward_speed_mps')
        turn = self.safe_float('turn_speed_rad_s')
        delay = self.safe_float('start_delay_s')
        first = self.safe_float('first_forward_s')
        turn_time = self.safe_float('turn_s')
        second = self.safe_float('second_forward_s')
        stop = self.safe_float('stop_s')

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

Validate numeric parameters before using them:

```python title="Parameter validation"
def safe_float(self, name: str) -> float:
    value = float(self.get_parameter(name).value)
    if value < 0.0 and name.endswith('_s'):
        raise ValueError(f'{name} must not be negative')
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

Keep normal bringup and autonomy as separate commands unless you intentionally add a command arbiter. One safe pattern is:

- `bringup.launch.py` starts motor, odometry, IMU, and fixed transforms
- `auton.launch.py` includes bringup and then starts `simple_auton`
- you do not run standard teleop at the same time as `simple_auton`

Before running autonomy on the real robot, check publisher count:

```bash title="Ubuntu terminal"
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
```

Expected result: the executable list includes `simple_auton`.

With teleop compatibility and your autonomous node in place, finish with [Polishing your package](/guides/ros2-package-guide/polish/).