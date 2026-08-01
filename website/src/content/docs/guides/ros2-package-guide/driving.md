---
title: Build Movement Nodes
description: Implement the motor and open-loop odometry nodes for the shared Waypoint robot hardware.
---

This step gives the package its movement backbone. You will build two related nodes:

- `motor_driver.py`: subscribes to `cmd_vel` and controls the real motor driver
- `open_loop_odom.py`: estimates motion and publishes `/odom`, `/path`, and `odom -> base_link`

Both nodes use the same command stream. Keep their responsibilities separate. The motor node drives hardware, while the odometry node publishes a command-based estimate.

## Read `Twist`

Open the official [`Twist` message definition](https://docs.ros.org/en/jazzy/p/geometry_msgs/msg/Twist.html) and locate `linear` and `angular`. Each one is a `Vector3`. Return here before writing code; you only need two fields for this robot.

```text title="Twist"
Twist
+-- linear: Vector3
|   +-- x: float64
|   +-- y: float64
|   +-- z: float64
+-- angular: Vector3
    +-- x: float64
    +-- y: float64
    +-- z: float64
```

Waypoint uses:

| Field | Meaning | Unit |
| --- | --- | --- |
| `linear.x` | forward or reverse request | meters per second |
| `angular.z` | counter-clockwise or clockwise turn request | radians per second |

Receive it like this:

```python title="Twist subscriber callback"
def cmd_vel_callback(self, message: Twist) -> None:
    forward_mps = float(message.linear.x)
    turn_rad_s = float(message.angular.z)
```

Publish it like this:

```python title="Twist publisher"
message = Twist()
message.linear.x = 0.10
message.angular.z = 0.30
publisher.publish(message)
```

The other `Twist` fields remain zero because this robot does not strafe sideways, move vertically, roll, or pitch.

## Create the Motor Node File

Create `cool_rover/cool_rover/motor_driver.py` and add an executable entry:

```python title="setup.py excerpt"
'motor_driver = cool_rover.motor_driver:main',
```

Start the file with the imports and node class:

```python title="motor_driver.py starter"
import math
import time

from geometry_msgs.msg import Twist
import rclpy
from rclpy.node import Node


class MotorDriver(Node):
    def __init__(self):
        super().__init__('motor_driver')
        self.declare_parameter('max_output', 0.30)
        self.declare_parameter('deadband', 0.04)
        self.declare_parameter('command_timeout_s', 0.50)
        self.declare_parameter('wheel_separation_m', 0.13)
        self.declare_parameter('approximate_max_wheel_speed_mps', 0.40)
        self.declare_parameter('invert_left', False)
        self.declare_parameter('invert_right', False)
        self.declare_parameter('left_front_pins', [5, 6])
        self.declare_parameter('left_rear_pins', [13, 19])
        self.declare_parameter('right_front_pins', [20, 21])
        self.declare_parameter('right_rear_pins', [23, 24])

        self.max_output = self.read_positive_float('max_output')
        self.deadband = self.read_nonnegative_float('deadband')
        if self.max_output > 1.0:
            raise ValueError('max_output must be no greater than 1.0')
        if self.deadband >= self.max_output:
            raise ValueError('deadband must be less than max_output')
        self.command_timeout_s = self.read_positive_float('command_timeout_s')
        self.wheel_separation_m = self.read_positive_float('wheel_separation_m')
        self.approximate_max_wheel_speed_mps = self.read_positive_float(
            'approximate_max_wheel_speed_mps'
        )
        self.invert_left = bool(self.get_parameter('invert_left').value)
        self.invert_right = bool(self.get_parameter('invert_right').value)

        # TODO: create your hardware channels here after reading your PCB pins.
        # Start with outputs at zero before any command can arrive.
        self.left_channels = []
        self.right_channels = []
        self.stop_motors()

        self.last_command_time = None
        self.create_subscription(Twist, 'cmd_vel', self.cmd_vel_callback, 10)
        self.create_timer(0.05, self.watchdog_tick)
```

Each `TODO` should be tied to your physical design. The pin lists come from your PCB schematic and wiring notes. Use BCM GPIO numbers in software.

Add the parameter validation helpers used above:

```python title="Parameter validation helpers"
def read_positive_float(self, name: str) -> float:
    value = float(self.get_parameter(name).value)
    if not math.isfinite(value) or value <= 0.0:
        raise ValueError(f'{name} must be a positive finite number')
    return value


def read_nonnegative_float(self, name: str) -> float:
    value = float(self.get_parameter(name).value)
    if not math.isfinite(value) or value < 0.0:
        raise ValueError(f'{name} must be zero or positive')
    return value
```

Failing fast on bad parameters is safer than silently turning nonsense into motor output.

## Convert `Twist` to Wheel Requests

For differential or skid-steer drive, the physical relationship is:

```text
left wheel speed  = linear.x - angular.z * wheel_separation / 2
right wheel speed = linear.x + angular.z * wheel_separation / 2
```

`linear.x` is m/s, `angular.z` is rad/s, and `wheel_separation` is meters. Multiplying rad/s by meters gives m/s because radians are dimensionless.

Those wheel-speed requests are not PWM yet. Convert them to the output range your driver accepts in a separate step:

```python title="Motor conversion helpers"
def mix_twist(self, forward_mps: float, turn_rad_s: float) -> tuple[float, float]:
    left_mps = forward_mps - turn_rad_s * self.wheel_separation_m / 2.0
    right_mps = forward_mps + turn_rad_s * self.wheel_separation_m / 2.0
    return left_mps, right_mps


def wheel_speed_to_output(self, speed_mps: float) -> float:
    output = speed_mps / self.approximate_max_wheel_speed_mps
    output = max(-self.max_output, min(self.max_output, output))
    if math.isclose(output, 0.0, abs_tol=self.deadband):
        return 0.0
    return output
```

You can take a guess on `approximate_max_wheel_speed_mps` for early stand tests. When you get the robot, measure and tune it to make odometry less goofy.

## Send Output to the Driver

Many small DRV8833 boards use two input pins per motor channel. One pin receives PWM for forward, the other receives PWM for reverse. GPIO is a signal source, not motor power; the motor power comes from the motor battery through the driver.

This channel helper is a common pattern for that wiring:

```python title="Two-pin motor channel pattern"
class MotorChannel:
    def __init__(self, forward_pin: int, reverse_pin: int, pin_factory):
        from gpiozero import PWMOutputDevice

        self.forward = PWMOutputDevice(forward_pin, pin_factory=pin_factory)
        self.reverse = PWMOutputDevice(reverse_pin, pin_factory=pin_factory)
        self.set_output(0.0)

    def set_output(self, output: float) -> None:
        output = max(-1.0, min(1.0, float(output)))
        if output > 0.0:
            self.forward.value = output
            self.reverse.value = 0.0
        elif output < 0.0:
            self.forward.value = 0.0
            self.reverse.value = -output
        else:
            self.forward.value = 0.0
            self.reverse.value = 0.0

    def close(self) -> None:
        self.set_output(0.0)
        self.forward.close()
        self.reverse.close()
```

If your final board exposes motor control differently, keep the same motor-node contract but replace this hardware helper. Do not change the meaning of `cmd_vel` to match a driver quirk.

Create the channels after reading the pin parameters. In `__init__`, replace the empty channel lists with this pattern once you are ready to run on the Raspberry Pi:

```python title="Create hardware channels"
from gpiozero.pins.lgpio import LGPIOFactory

pin_factory = LGPIOFactory()
self.left_channels = [
    self.make_channel('left_front_pins', pin_factory),
    self.make_channel('left_rear_pins', pin_factory),
]
self.right_channels = [
    self.make_channel('right_front_pins', pin_factory),
    self.make_channel('right_rear_pins', pin_factory),
]
self.stop_motors()
```

Then add the helper:

```python title="Create channels from YAML pins"
def make_channel(self, parameter_name: str, pin_factory) -> MotorChannel:
    pins = list(self.get_parameter(parameter_name).value)
    if len(pins) != 2:
        raise ValueError(f'{parameter_name} must contain exactly two BCM GPIO pins')
    return MotorChannel(int(pins[0]), int(pins[1]), pin_factory)
```

OrphBot's `motor_driver.py` is useful for studying GPIO cleanup and watchdog shape. Its pin numbers and normalization values are OrphBot's choices, not universal Waypoint facts.

## Apply Commands Safely

Add these methods to your node:

```python title="Motor safety methods"
def cmd_vel_callback(self, message: Twist) -> None:
    forward_mps = float(message.linear.x)
    turn_rad_s = float(message.angular.z)
    if not math.isfinite(forward_mps) or not math.isfinite(turn_rad_s):
        self.get_logger().error('Ignoring non-finite cmd_vel')
        self.stop_motors()
        return

    left_mps, right_mps = self.mix_twist(forward_mps, turn_rad_s)
    left_output = self.wheel_speed_to_output(left_mps)
    right_output = self.wheel_speed_to_output(right_mps)

    if self.invert_left:
        left_output = -left_output
    if self.invert_right:
        right_output = -right_output

    self.set_sides(left_output, right_output)
    self.last_command_time = time.monotonic()


def set_sides(self, left_output: float, right_output: float) -> None:
    for channel in self.left_channels:
        channel.set_output(left_output)
    for channel in self.right_channels:
        channel.set_output(right_output)


def stop_motors(self) -> None:
    self.set_sides(0.0, 0.0)


def watchdog_tick(self) -> None:
    if self.last_command_time is None:
        return
    age = time.monotonic() - self.last_command_time
    if age > self.command_timeout_s:
        self.stop_motors()
        self.last_command_time = None
```

The watchdog is what stops the robot when teleop dies, autonomy crashes, or Wi-Fi drops. It is not optional polish.

Shutdown should also command zero and close GPIO objects:

```python title="Shutdown cleanup pattern"
def destroy_node(self):
    self.stop_motors()
    for channel in self.left_channels + self.right_channels:
        channel.close()
    super().destroy_node()
```

In `main()`, destroy the node in a `finally` block so `Ctrl+C` still stops output.

```python title="Motor node main"
def main(args=None):
    rclpy.init(args=args)
    node = None
    try:
        node = MotorDriver()
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        if node is not None:
            node.destroy_node()
        if rclpy.ok():
            rclpy.shutdown()
```

## Create Open-Loop Odometry

Create `cool_rover/cool_rover/open_loop_odom.py` and add an executable entry:

```python title="setup.py excerpt"
'open_loop_odom = cool_rover.open_loop_odom:main',
```

This node estimates pose from command velocity. It does not measure wheel movement.

Start the file with the imports and a compact node wrapper:

```python title="open_loop_odom.py outer scaffold"
import math

from geometry_msgs.msg import PoseStamped, TransformStamped, Twist
from nav_msgs.msg import Odometry, Path
import rclpy
from rclpy.node import Node
from tf2_ros import TransformBroadcaster


class OpenLoopOdom(Node):
    def __init__(self):
        super().__init__('open_loop_odom')

        # Declare and read parameters here.
        # Create state, publishers, subscription, broadcaster, and timer here.
```

The next two snippets belong inside `__init__`: put the parameter block under "Declare and read parameters here," then put the state, publisher, subscription, broadcaster, and timer block under the second comment.

Declare and read its parameters first:

```python title="Odometry parameters"
self.declare_parameter('odom_frame', 'odom')
self.declare_parameter('base_frame', 'base_link')
self.declare_parameter('publish_rate_hz', 10.0)
self.declare_parameter('linear_scale', 1.0)
self.declare_parameter('angular_scale', 1.0)
self.declare_parameter('path_max_poses', 500)
self.declare_parameter('command_timeout_s', 0.55)

self.odom_frame = str(self.get_parameter('odom_frame').value)
self.base_frame = str(self.get_parameter('base_frame').value)
self.publish_rate_hz = self.read_positive_float('publish_rate_hz')
self.linear_scale = self.read_finite_float('linear_scale')
self.angular_scale = self.read_finite_float('angular_scale')
self.path_max_poses = self.read_positive_int('path_max_poses')
self.command_timeout_s = self.read_positive_float('command_timeout_s')
```

Add these small helper methods inside `OpenLoopOdom`, at the same indentation level as callbacks:

```python title="Odometry validation helpers"
def read_positive_float(self, name: str) -> float:
    value = float(self.get_parameter(name).value)
    if not math.isfinite(value) or value <= 0.0:
        raise ValueError(f'{name} must be a positive finite number')
    return value


def read_finite_float(self, name: str) -> float:
    value = float(self.get_parameter(name).value)
    if not math.isfinite(value):
        raise ValueError(f'{name} must be finite')
    return value


def read_positive_int(self, name: str) -> int:
    raw_value = self.get_parameter(name).value
    value = int(raw_value)
    if value != raw_value or value <= 0:
        raise ValueError(f'{name} must be a positive integer')
    return value
```

Keep state like this:

```python title="Odometry state"
self.x = 0.0
self.y = 0.0
self.yaw = 0.0
self.linear_mps = 0.0
self.angular_rad_s = 0.0
self.last_time = self.get_clock().now()
self.last_command_time = None
self.path = Path()
self.path.header.frame_id = self.odom_frame
self.odom_pub = self.create_publisher(Odometry, 'odom', 10)
self.path_pub = self.create_publisher(Path, 'path', 10)
self.tf_broadcaster = TransformBroadcaster(self)
self.create_subscription(Twist, 'cmd_vel', self.cmd_vel_callback, 10)
self.create_timer(1.0 / self.publish_rate_hz, self.tick)
```

The subscription stores the most recent command:

```python title="Odometry cmd_vel callback"
def cmd_vel_callback(self, message: Twist) -> None:
    forward_mps = float(message.linear.x)
    turn_rad_s = float(message.angular.z)
    if not math.isfinite(forward_mps) or not math.isfinite(turn_rad_s):
        self.get_logger().error('Ignoring non-finite cmd_vel')
        self.linear_mps = 0.0
        self.angular_rad_s = 0.0
        self.last_command_time = None
        return

    self.linear_mps = forward_mps * self.linear_scale
    self.angular_rad_s = turn_rad_s * self.angular_scale
    self.last_command_time = self.get_clock().now()
```

The timer integrates with actual elapsed time. Put the timer work in `tick()` in this order: get the current ROS time, calculate `dt`, apply the command timeout, update `x`, `y`, and `yaw`, create the quaternion, create one message timestamp, publish `Odometry`, publish matching TF, then append and publish `Path`.

```python title="Integrate pose inside tick"
def tick(self) -> None:
    now = self.get_clock().now()
    dt = (now - self.last_time).nanoseconds / 1e9
    self.last_time = now

    if dt < 0.0 or dt > 1.0:
        dt = 0.0

    if self.last_command_time is not None:
        age = (now - self.last_command_time).nanoseconds / 1e9
        if age > self.command_timeout_s:
            self.linear_mps = 0.0
            self.angular_rad_s = 0.0
            self.last_command_time = None

    self.x += self.linear_mps * math.cos(self.yaw) * dt
    self.y += self.linear_mps * math.sin(self.yaw) * dt
    self.yaw += self.angular_rad_s * dt
    self.yaw = math.atan2(math.sin(self.yaw), math.cos(self.yaw))

    qx, qy, qz, qw = yaw_to_quaternion(self.yaw)
    stamp = now.to_msg()

    # Publish Odometry, TF, and Path next.
```

## Build a Quaternion

Do not teach yourself full 3D quaternion math today. For a flat robot yawing around the z axis:

```python title="Yaw quaternion"
def yaw_to_quaternion(yaw: float) -> tuple[float, float, float, float]:
    half_yaw = yaw / 2.0
    return 0.0, 0.0, math.sin(half_yaw), math.cos(half_yaw)
```

`(0, 0, 0, 1)` means no rotation. `(0, 0, 0, 0)` is invalid.

## Publish `Odometry`

Open the official [`Odometry` message definition](https://docs.ros.org/en/jazzy/p/nav_msgs/msg/Odometry.html). Locate `header`, `child_frame_id`, `pose.pose`, `pose.covariance`, `twist.twist`, and `twist.covariance`.

```text title="Odometry fields used here"
Odometry
+-- header.frame_id: odom
+-- child_frame_id: base_link
+-- pose.pose.position.x/y
+-- pose.pose.orientation
+-- twist.twist.linear.x
+-- twist.twist.angular.z
```

`message.pose.pose` is not a typo. The outer object combines pose with covariance. The inner object is the actual pose.

The next three snippets are still inside `tick()`, after `stamp` and the quaternion variables exist.

```python title="Publish odometry inside tick"
    odom = Odometry()
    odom.header.stamp = stamp
    odom.header.frame_id = self.odom_frame
    odom.child_frame_id = self.base_frame
    odom.pose.pose.position.x = self.x
    odom.pose.pose.position.y = self.y
    odom.pose.pose.position.z = 0.0
    odom.pose.pose.orientation.x = qx
    odom.pose.pose.orientation.y = qy
    odom.pose.pose.orientation.z = qz
    odom.pose.pose.orientation.w = qw
    odom.twist.twist.linear.x = self.linear_mps
    odom.twist.twist.angular.z = self.angular_rad_s
    odom.pose.covariance[0] = 0.08
    odom.pose.covariance[7] = 0.08
    odom.pose.covariance[35] = 0.25
    odom.twist.covariance[0] = 0.12
    odom.twist.covariance[35] = 0.35
    self.odom_pub.publish(odom)
```

Covariance values are estimates of uncertainty. Do not fill them with zeros to imply perfect certainty.

## Broadcast TF

TF lets RViz and other tools know how frames relate. Your odometry node should broadcast `odom -> base_link` with the same pose as `/odom`.

```python title="Broadcast odom to base_link inside tick"
    transform = TransformStamped()
    transform.header.stamp = stamp
    transform.header.frame_id = self.odom_frame
    transform.child_frame_id = self.base_frame
    transform.transform.translation.x = self.x
    transform.transform.translation.y = self.y
    transform.transform.translation.z = 0.0
    transform.transform.rotation.x = qx
    transform.transform.rotation.y = qy
    transform.transform.rotation.z = qz
    transform.transform.rotation.w = qw
    self.tf_broadcaster.sendTransform(transform)
```

Do not add a fake `map -> odom` transform for this project. RViz should use `odom` as the fixed frame.

## Publish a Bounded Path

Open the official [`Path` message definition](https://docs.ros.org/en/jazzy/p/nav_msgs/msg/Path.html). `poses` is a list of `PoseStamped` messages.

```python title="Append and trim path inside tick"
    pose = PoseStamped()
    pose.header = odom.header
    pose.pose = odom.pose.pose
    self.path.header.stamp = stamp
    self.path.header.frame_id = self.odom_frame
    self.path.poses.append(pose)
    if len(self.path.poses) > self.path_max_poses:
        self.path.poses = self.path.poses[-self.path_max_poses:]
    self.path_pub.publish(self.path)
```

OrphBot's `odom_publisher.py` is a good file to inspect for nested ROS assignments and path trimming. Keep your node name and executable name consistent with this guide: `open_loop_odom`.

Finish the file with the same safe lifecycle pattern as the other nodes:

```python title="Open-loop odom main"
def main(args=None):
    rclpy.init(args=args)
    node = OpenLoopOdom()

    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        if rclpy.ok():
            rclpy.shutdown()
```

## Build and Inspect

Add both executable entries, rebuild, and check discovery:

```bash title="Ubuntu terminal"
WORKSPACE_NAME="cool_rover_ws"
PACKAGE_NAME="cool_rover"

cd ~/"$WORKSPACE_NAME"
source /opt/ros/jazzy/setup.bash
colcon build --symlink-install
source install/setup.bash
ros2 pkg executables "$PACKAGE_NAME"
```

Expected result: the executable list includes `motor_driver` and `open_loop_odom`.

When you can explain the motor conversion, watchdog, command-based odometry, quaternion, TF, and path, continue to [Publish IMU data](/guides/ros2-package-guide/imu/).