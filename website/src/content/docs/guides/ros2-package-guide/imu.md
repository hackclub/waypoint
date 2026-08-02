---
title: Publish IMU Data
description: Add the required MPU6050 IMU node to your Waypoint package.
---

Every Waypoint robot includes an IMU. Add a node that reads the physical MPU6050 over I2C and publishes `sensor_msgs/msg/Imu` on `imu/data_raw`. In CLI tools you will usually see that resolved as `/imu/data_raw`.

## Read the Imu Message

Open the official [`Imu` message definition](https://docs.ros.org/en/jazzy/p/sensor_msgs/msg/Imu.html). Locate the header, orientation, angular velocity, linear acceleration, and three covariance arrays. Pay attention to the units and the rule for marking an estimate unavailable.

```text title="Imu"
Imu
+-- header: Header
+-- orientation: Quaternion
+-- orientation_covariance: float64[9]
+-- angular_velocity: Vector3
+-- angular_velocity_covariance: float64[9]
+-- linear_acceleration: Vector3
+-- linear_acceleration_covariance: float64[9]
```

The MPU6050 gives you accelerometer and gyroscope data. It does not produce a fused orientation by itself.

| Field | MPU6050 provides it? | What your node does |
| --- | --- | --- |
| timestamp | no | use `self.get_clock().now().to_msg()` |
| frame | no | use your configured IMU frame, usually `imu_link` |
| orientation | no | mark unavailable with `orientation_covariance[0] = -1.0` |
| angular velocity | yes | scale raw gyro and convert degrees/s to rad/s |
| linear acceleration | yes | scale raw accel and convert g to m/s^2 |
| covariance | not directly | use documented nonzero estimates |

## Decide the IMU Frame

ROS uses the [REP 103](https://www.ros.org/reps/rep-0103.html) robot convention: x forward, y left, z up. Draw the IMU on your chassis and record which chip axis points forward, left, and up.

You need one documented relationship from `base_link` to `imu_link`. You can provide it with a fixed transform in launch or with your robot description. Do not rotate the raw IMU axes in code and then publish the same mounting rotation again in TF.

A simple fixed transform launch entry looks like this, but the numbers must come from your mounting. In `static_transform_publisher`, `base_link` is the parent frame and `imu_link` is the child frame. The `x`, `y`, and `z` translations are in meters; `roll`, `pitch`, and `yaw` are in radians. Convert CAD dimensions from millimeters to meters, and convert measured angles from degrees to radians.

```python title="launch fixed IMU transform pattern"
Node(
    package='tf2_ros',
    executable='static_transform_publisher',
    name='base_to_imu_link',
    arguments=[
        '--x', '0.04', '--y', '0.00', '--z', '0.03',
        '--roll', '0', '--pitch', '0', '--yaw', '0',
        '--frame-id', 'base_link', '--child-frame-id', 'imu_link',
    ],
)
```

## Read Signed MPU6050 Values

The MPU6050 stores each axis as two bytes: a high byte and a low byte. Combine them into one 16-bit number, then convert from unsigned to signed two's-complement form.

The official TDK InvenSense [MPU-6000/MPU-6050 register map](https://invensense.tdk.com/wp-content/uploads/2015/02/MPU-6000-Register-Map1.pdf) is the source for the register names, reset defaults, and sensitivity numbers used here. You do not need to read the whole document; locate `WHO_AM_I`, `PWR_MGMT_1`, the accelerometer output registers, the gyroscope output registers, the reset-default accelerometer and gyroscope ranges, and the sensitivity values for +/-2 g and +/-250 deg/s.

This helper belongs inside `MPU6050Node` at the same indentation level as `publish_sample()`.

```python title="Signed 16-bit register read"
def read_word_signed(self, register: int) -> int:
    high = self.bus.read_byte_data(self.address, register)
    low = self.bus.read_byte_data(self.address, register + 1)
    value = (high << 8) | low
    if value >= 0x8000:
        value -= 0x10000
    return value
```

`high << 8` shifts the high byte into the upper half of the 16-bit value. `| low` fills in the lower byte. The `0x8000` check turns values such as `0xfff0` into negative numbers.

OrphBot's `mpu6050_node.py` provides an implementation for signed register reads and clear I2C startup errors. Its axis assumptions and bias values will not automatically work for your robot though.

## Use Scale Constants

This implementation assumes the MPU6050 has powered up or reset with its default range selections:

| Sensor range | Raw counts per unit |
| --- | --- |
| accelerometer +/-2 g | `16384` counts per g |
| gyro +/-250 deg/s | `131` counts per deg/s |

Writing `0x00` to `PWR_MGMT_1` wakes the sensor. It does not change those range selections. The constants below match the reset defaults; if you change the range registers later, update the scale constants too.

```python title="Scale conversion"
G_TO_MPS2 = 9.80665
ACCEL_SCALE_COUNTS_PER_G = 16384.0
GYRO_SCALE_COUNTS_PER_DEG_S = 131.0

accel_x_mps2 = self.read_word_signed(0x3B) / ACCEL_SCALE_COUNTS_PER_G * G_TO_MPS2
gyro_x_rad_s = math.radians(self.read_word_signed(0x43) / GYRO_SCALE_COUNTS_PER_DEG_S)
```

Acceleration uses meters per second squared. Gyro uses radians per second. `math.radians()` converts degrees to radians.

## Keep Bias Optional

A real gyro usually reports a tiny turn rate even when the robot is still. Keep the bias parameters in your config, but leave them at zero unless you choose to tune them later.

```yaml title="config/robot.yaml excerpt"
imu_node:
  ros__parameters:
    bus: 1
    address: 104
    frame_id: imu_link
    publish_rate_hz: 20.0
    gyro_bias_x_rad_s: 0.0
    gyro_bias_y_rad_s: 0.0
    gyro_bias_z_rad_s: 0.0
```

The three gyro bias parameters may stay at `0.0` for your submission. If you want steadier stationary gyro readings, follow the optional [gyro bias calibration extra](/extras/gyro-bias-calibration/) after bringup works.

## Build the Node

Create `cool_rover/cool_rover/imu_node.py` and add an executable entry:

```python title="setup.py excerpt"
'imu_node = cool_rover.imu_node:main',
```

Start the file with the imports and compact node wrapper used by the snippets below:

```python title="imu_node.py outer scaffold"
import math

from sensor_msgs.msg import Imu
import rclpy
from rclpy.node import Node


class MPU6050Node(Node):
    def __init__(self):
        super().__init__('imu_node')
        self.bus = None

        # Declare and read parameters.
        # Open and initialize I2C.
        # Create the publisher and timer.
```

The parameter, bus, publisher, and timer snippets below all belong inside `__init__`. The helper methods and `publish_sample()` belong inside `MPU6050Node` at the same indentation level as `__init__`.

The node structure should follow this sequence:

1. Declare bus, address, frame, rate, and bias parameters.
2. Open the I2C bus.
3. Read `WHO_AM_I` so wiring problems produce a clear error.
4. Wake the sensor by writing `0x00` to `PWR_MGMT_1`.
5. Create a publisher for `imu/data_raw`.
6. Use a timer to read and publish samples.
7. Close the I2C bus during shutdown.

Useful constants:

```python title="MPU6050 constants"
ACCEL_XOUT_H = 0x3B
ACCEL_YOUT_H = 0x3D
ACCEL_ZOUT_H = 0x3F
GYRO_XOUT_H = 0x43
GYRO_YOUT_H = 0x45
GYRO_ZOUT_H = 0x47
PWR_MGMT_1 = 0x6B
WHO_AM_I = 0x75
ACCEL_SCALE_COUNTS_PER_G = 16384.0
GYRO_SCALE_COUNTS_PER_DEG_S = 131.0
G_TO_MPS2 = 9.80665
```

Declare and read parameters inside `__init__`:

```python title="IMU parameters"
self.declare_parameter('bus', 1)
self.declare_parameter('address', 0x68)
self.declare_parameter('frame_id', 'imu_link')
self.declare_parameter('publish_rate_hz', 20.0)
self.declare_parameter('gyro_bias_x_rad_s', 0.0)
self.declare_parameter('gyro_bias_y_rad_s', 0.0)
self.declare_parameter('gyro_bias_z_rad_s', 0.0)

self.bus_number = self.read_nonnegative_int('bus')
self.address = self.read_i2c_address('address')
self.frame_id = str(self.get_parameter('frame_id').value)
self.publish_rate_hz = self.read_positive_float('publish_rate_hz')
self.gyro_bias_x_rad_s = self.read_finite_float('gyro_bias_x_rad_s')
self.gyro_bias_y_rad_s = self.read_finite_float('gyro_bias_y_rad_s')
self.gyro_bias_z_rad_s = self.read_finite_float('gyro_bias_z_rad_s')
```

Add the validation helpers inside `MPU6050Node`:

```python title="IMU parameter validation helpers"
def read_nonnegative_int(self, name: str) -> int:
    raw_value = self.get_parameter(name).value
    value = int(raw_value)
    if value != raw_value or value < 0:
        raise ValueError(f'{name} must be a nonnegative integer')
    return value


def read_i2c_address(self, name: str) -> int:
    raw_value = self.get_parameter(name).value
    value = int(raw_value)
    if value != raw_value or value < 0x08 or value > 0x77:
        raise ValueError(f'{name} must be a valid 7-bit I2C address')
    return value


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
```

Opening the bus should produce beginner-readable errors:

```python title="Open I2C bus"
def open_bus(self):
    try:
        from smbus2 import SMBus
    except ImportError:
        from smbus import SMBus
    return SMBus(self.bus_number)
```

Initialize the sensor:

```python title="Initialize MPU6050"
def initialize_sensor(self) -> None:
    try:
        whoami = self.bus.read_byte_data(self.address, WHO_AM_I)
    except OSError as exc:
        raise RuntimeError(
            f'MPU6050 did not respond at 0x{self.address:02x} on I2C bus {self.bus_number}. '
            'Run i2cdetect, then check VCC, GND, SDA, SCL, AD0, and solder joints.'
        ) from exc

    if whoami not in (0x68, 0x70, 0x71):
        raise RuntimeError(f'Unexpected WHO_AM_I value: 0x{whoami:02x}')

    self.bus.write_byte_data(self.address, PWR_MGMT_1, 0x00)
```

After those methods, wire the bus and ROS publisher/timer together inside `__init__`, after parameter reading:

```python title="IMU __init__ hardware and ROS setup"
self.bus = self.open_bus()
self.initialize_sensor()

self.publisher = self.create_publisher(
    Imu,
    'imu/data_raw',
    10,
)
self.last_error_log_time = None
self.timer = self.create_timer(
    1.0 / self.publish_rate_hz,
    self.publish_sample,
)
```

## Populate the Message

The timer callback reads all six axes before it builds a message. If one I2C read fails, log at a controlled rate and return without publishing a half-filled sample.

```python title="Read and publish one IMU sample"
def publish_sample(self) -> None:
    now = self.get_clock().now()

    try:
        accel_x_mps2 = self.read_word_signed(ACCEL_XOUT_H) / ACCEL_SCALE_COUNTS_PER_G * G_TO_MPS2
        accel_y_mps2 = self.read_word_signed(ACCEL_YOUT_H) / ACCEL_SCALE_COUNTS_PER_G * G_TO_MPS2
        accel_z_mps2 = self.read_word_signed(ACCEL_ZOUT_H) / ACCEL_SCALE_COUNTS_PER_G * G_TO_MPS2

        gyro_x_rad_s = math.radians(
            self.read_word_signed(GYRO_XOUT_H) / GYRO_SCALE_COUNTS_PER_DEG_S
        )
        gyro_y_rad_s = math.radians(
            self.read_word_signed(GYRO_YOUT_H) / GYRO_SCALE_COUNTS_PER_DEG_S
        )
        gyro_z_rad_s = math.radians(
            self.read_word_signed(GYRO_ZOUT_H) / GYRO_SCALE_COUNTS_PER_DEG_S
        )
    except OSError as exc:
        if (
            self.last_error_log_time is None
            or (now - self.last_error_log_time).nanoseconds / 1e9 > 2.0
        ):
            self.get_logger().error(f'Failed to read MPU6050 sample: {exc}')
            self.last_error_log_time = now
        return

    self.last_error_log_time = None

    message = Imu()
    message.header.stamp = now.to_msg()
    message.header.frame_id = self.frame_id

    message.orientation.w = 1.0
    message.orientation_covariance[0] = -1.0

    message.linear_acceleration.x = accel_x_mps2
    message.linear_acceleration.y = accel_y_mps2
    message.linear_acceleration.z = accel_z_mps2
    message.angular_velocity.x = gyro_x_rad_s - self.gyro_bias_x_rad_s
    message.angular_velocity.y = gyro_y_rad_s - self.gyro_bias_y_rad_s
    message.angular_velocity.z = gyro_z_rad_s - self.gyro_bias_z_rad_s

    message.linear_acceleration_covariance[0] = 0.04
    message.linear_acceleration_covariance[4] = 0.04
    message.linear_acceleration_covariance[8] = 0.04
    message.angular_velocity_covariance[0] = 0.02
    message.angular_velocity_covariance[4] = 0.02
    message.angular_velocity_covariance[8] = 0.02
    self.publisher.publish(message)
```

`orientation.w = 1.0` avoids an invalid all-zero quaternion. `orientation_covariance[0] = -1.0` tells readers not to use orientation from this message.

Close the bus during shutdown:

```python title="IMU cleanup"
def destroy_node(self):
    try:
        if self.bus is not None:
            self.bus.close()
    finally:
        super().destroy_node()
```

Use the same safe `main()` shape as the other nodes:

```python title="IMU node main"
def main(args=None):
    rclpy.init(args=args)
    node = None
    try:
        node = MPU6050Node()
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        if node is not None:
            node.destroy_node()
        if rclpy.ok():
            rclpy.shutdown()
```

## Build and Inspect

Add the executable entry, add `imu_node` to `launch/bringup.launch.py`, rebuild, and confirm discovery:

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

## Final Bringup Checkpoint

By the time you leave this page, normal `bringup.launch.py` should start the required robot stack only:

- `motor_driver`
- `open_loop_odom`
- `imu_node`
- one static `base_link -> imu_link` transform using your measured IMU mounting

If your earlier launch file still has only the three nodes, insert the static-transform node into the same `LaunchDescription` list. The numbers below are examples; replace them with your measured mounting translation and rotation. Keep this as one frame relationship: do not also add a URDF transform for the same `base_link -> imu_link` pair.

```python title="launch/bringup.launch.py required nodes"
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
    Node(
        package='tf2_ros',
        executable='static_transform_publisher',
        name='base_to_imu_link',
        arguments=[
            '--x', '0.04', '--y', '0.00', '--z', '0.03',
            '--roll', '0', '--pitch', '0', '--yaw', '0',
            '--frame-id', 'base_link', '--child-frame-id', 'imu_link',
        ],
    ),
])
```

Do not add a fake `map -> odom` transform here, and do not put `simple_auton` in normal bringup.

Start bringup in one terminal:

```bash title="Raspberry Pi SSH terminal 1"
WORKSPACE_NAME="cool_rover_ws"
PACKAGE_NAME="cool_rover"

source /opt/ros/jazzy/setup.bash
source ~/"$WORKSPACE_NAME"/install/setup.bash
ros2 launch "$PACKAGE_NAME" bringup.launch.py
```

Then check the expected nodes and transforms from another sourced terminal:

```bash title="Raspberry Pi SSH terminal 2"
WORKSPACE_NAME="cool_rover_ws"

source /opt/ros/jazzy/setup.bash
source ~/"$WORKSPACE_NAME"/install/setup.bash
ros2 node list
timeout 3 ros2 run tf2_ros tf2_echo odom base_link
timeout 3 ros2 run tf2_ros tf2_echo base_link imu_link
```

Expected result: `ros2 node list` includes `/motor_driver`, `/open_loop_odom`, and `/imu_node`; the two `tf2_echo` commands print the odometry and IMU transforms before `timeout` exits.

The real I2C scan, stationary readings, axis checks, covariance check, and publish-rate check happen during [Put Your Package on a Robot](/guides/robot-bringup/).

Continue to [Add teleop and autonomy](/guides/ros2-package-guide/autonomy/).
