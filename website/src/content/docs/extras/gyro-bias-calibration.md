---
title: Gyro Bias Calibration
description: Optional stationary MPU6050 gyro-bias measurement for cleaner raw IMU readings.
---

A real gyro can report a small turn rate even when the robot is completely still. That offset is bias. Measuring it can make stationary `angular_velocity` readings calmer, but this extra is optional and it is not required for bringup.

This does not create fused orientation. It is only a basic stationary average of the three gyro axes. Temperature changes can shift gyro bias, so treat these values as practical tuning numbers, not permanent truth from the mountain.

Run this helper only after your required IMU node publishes `imu/data_raw`. Leave `gyro_bias_x_rad_s`, `gyro_bias_y_rad_s`, and `gyro_bias_z_rad_s` at `0.0` while collecting samples. If you already changed them, temporarily set them back to zero for this run.

## Add the Helper

Create `cool_rover/cool_rover/gyro_bias_calibrator.py` and add this executable entry to `setup.py`:

```python title="setup.py excerpt"
'gyro_bias_calibrator = cool_rover.gyro_bias_calibrator:main',
```

Use this node:

```python title="gyro_bias_calibrator.py"
import math

from sensor_msgs.msg import Imu
import rclpy
from rclpy.executors import ExternalShutdownException
from rclpy.node import Node


class GyroBiasCalibrator(Node):
    def __init__(self):
        super().__init__('gyro_bias_calibrator')
        self.declare_parameter('sample_count', 200)
        raw_sample_count = self.get_parameter('sample_count').value
        self.sample_count = int(raw_sample_count)
        if self.sample_count != raw_sample_count or self.sample_count <= 0:
            raise ValueError('sample_count must be a positive integer')

        self.count = 0
        self.sum_x = 0.0
        self.sum_y = 0.0
        self.sum_z = 0.0
        self.subscription = self.create_subscription(
            Imu,
            'imu/data_raw',
            self.sample_callback,
            10,
        )
        self.get_logger().info(
            f'Keep the robot completely still; collecting {self.sample_count} samples.'
        )

    def sample_callback(self, message: Imu) -> None:
        values = (
            float(message.angular_velocity.x),
            float(message.angular_velocity.y),
            float(message.angular_velocity.z),
        )
        if not all(math.isfinite(value) for value in values):
            self.get_logger().warning('Skipping non-finite IMU sample')
            return

        self.sum_x += values[0]
        self.sum_y += values[1]
        self.sum_z += values[2]
        self.count += 1

        if self.count >= self.sample_count:
            self.print_result()
            rclpy.shutdown()

    def print_result(self) -> None:
        scale = 1.0 / self.count
        print('gyro_bias_x_rad_s: {:.6f}'.format(self.sum_x * scale))
        print('gyro_bias_y_rad_s: {:.6f}'.format(self.sum_y * scale))
        print('gyro_bias_z_rad_s: {:.6f}'.format(self.sum_z * scale))


def main(args=None):
    rclpy.init(args=args)
    node = None
    try:
        node = GyroBiasCalibrator()
        rclpy.spin(node)
    except (KeyboardInterrupt, ExternalShutdownException):
        pass
    finally:
        if node is not None:
            node.destroy_node()
        if rclpy.ok():
            rclpy.shutdown()
```

## Run It

Start normal bringup in one terminal, with the IMU node bias parameters still set to zero. Do not add the calibrator to `bringup.launch.py`.

In a second sourced terminal, build and run the helper:

```bash title="Raspberry Pi SSH terminal"
WORKSPACE_NAME="cool_rover_ws"
PACKAGE_NAME="cool_rover"

cd ~/"$WORKSPACE_NAME"
source /opt/ros/jazzy/setup.bash
colcon build --symlink-install
source install/setup.bash
ros2 run "$PACKAGE_NAME" gyro_bias_calibrator --ros-args -p sample_count:=200
```

Keep the robot still until the command exits. The output will look like this:

```yaml title="example output"
gyro_bias_x_rad_s: 0.0061
gyro_bias_y_rad_s: -0.0034
gyro_bias_z_rad_s: 0.0017
```

Copy those three values under `imu_node.ros__parameters` in `config/robot.yaml`:

```yaml title="config/robot.yaml excerpt"
imu_node:
  ros__parameters:
    gyro_bias_x_rad_s: 0.0061
    gyro_bias_y_rad_s: -0.0034
    gyro_bias_z_rad_s: 0.0017
```

Rebuild, source, launch bringup again, and echo `/imu/data_raw` while the robot is still. The gyro values should sit closer to zero. If they drift later, re-run the helper with the robot still and the current bias parameters temporarily returned to `0.0`.
