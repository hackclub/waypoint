---
title: Publish IMU Data
description: Add the required MPU6050 IMU node to your Waypoint package.
---

Every Waypoint robot includes an IMU. Add a node that reads the physical MPU6050 over I2C and publishes `sensor_msgs/msg/Imu` on `imu/data_raw`. In CLI tools you will usually see that resolved as `/imu/data_raw`.

## Read the `Imu` Message

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

A simple fixed transform launch entry looks like this, but the numbers must come from your mounting:

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

OrphBot's `mpu6050_node.py` is useful for studying signed register reads and clear I2C startup errors. Its axis assumptions and bias values are not automatically yours.

## Use Scale Constants

The common default MPU6050 ranges are:

| Sensor range | Raw counts per unit |
| --- | --- |
| accelerometer +/-2 g | `16384` counts per g |
| gyro +/-250 deg/s | `131` counts per deg/s |

Use the values that match the ranges you configure. If you change MPU6050 range registers later, update the scale constants too.

```python title="Scale conversion"
G_TO_MPS2 = 9.80665

accel_x_mps2 = self.read_word_signed(0x3B) / 16384.0 * G_TO_MPS2
gyro_x_rad_s = math.radians(self.read_word_signed(0x43) / 131.0)
```

Acceleration uses meters per second squared. Gyro uses radians per second. `math.radians()` converts degrees to radians.

## Measure Gyro Bias

A real gyro usually reports a tiny turn rate even when the robot is still. Measure that bias with the robot stationary and subtract it.

Add parameters:

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

During bringup, echo `/imu/data_raw` while the robot is still, average the gyro values for a few seconds, and put those averages into the bias parameters. You do not need full sensor fusion for this project.

## Build the Node

Create `cool_rover/cool_rover/imu_node.py` and add an executable entry:

```python title="setup.py excerpt"
'imu_node = cool_rover.imu_node:main',
```

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
GYRO_XOUT_H = 0x43
PWR_MGMT_1 = 0x6B
WHO_AM_I = 0x75
G_TO_MPS2 = 9.80665
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

## Populate the Message

Set a valid orientation object, then mark orientation unavailable:

```python title="Populate Imu message"
message = Imu()
message.header.stamp = self.get_clock().now().to_msg()
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

The real I2C scan, stationary readings, axis checks, covariance check, and publish-rate check happen during [Put Your Package on a Robot](/guides/robot-bringup/).

Continue to [Add teleop and autonomy](/guides/ros2-package-guide/autonomy/).