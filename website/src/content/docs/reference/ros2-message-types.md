---
title: ROS 2 Message Types Used by Waypoint
description: Field trees and Python assignment patterns for the ROS messages in the Waypoint package guide.
---

Use this page when a guide step mentions a message field you do not recognize. The official message definitions are still the source of truth, but this page explains the parts this robot actually uses.

## Reading a Message

Use this method every time:

1. Run `ros2 interface show MESSAGE_TYPE`.
2. Find nested messages and arrays.
3. Identify the fields your node must set or read.
4. Check units.
5. Set headers and frames when they exist.
6. Compare the result with `ros2 topic echo`.

## `geometry_msgs/msg/Twist`

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

Waypoint uses `linear.x` in meters per second and `angular.z` in radians per second.

```python title="Publish Twist"
message = Twist()
message.linear.x = 0.10
message.angular.z = 0.30
publisher.publish(message)
```

The other fields stay zero because this is a ground robot that does not strafe, fly, roll, or pitch.

## `std_msgs/msg/Header`

```text title="Header"
Header
+-- stamp
|   +-- sec
|   +-- nanosec
+-- frame_id: string
```

`stamp` says when the data applies. `frame_id` says which coordinate frame the data is expressed in.

```python title="Set a header"
message.header.stamp = self.get_clock().now().to_msg()
message.header.frame_id = 'imu_link'
```

Let ROS fill `sec` and `nanosec` from the clock. Do not fill those two fields by hand unless you are writing a special time tool.

## `geometry_msgs/msg/Quaternion`

ROS uses 3D orientations even for a flat ground robot. For yaw-only motion:

```python title="Yaw to quaternion"
half_yaw = yaw / 2.0
qx = 0.0
qy = 0.0
qz = math.sin(half_yaw)
qw = math.cos(half_yaw)
```

`(0, 0, 0, 1)` means no rotation. `(0, 0, 0, 0)` is not a valid orientation.

## `sensor_msgs/msg/Imu`

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

| Field | MPU6050 provides it? | Required handling |
| --- | --- | --- |
| timestamp | no | use the ROS clock |
| frame | no | use the configured IMU frame |
| orientation | no | do not fabricate it |
| angular velocity | yes | scale and convert to rad/s |
| linear acceleration | yes | scale and convert to m/s^2 |
| covariance | not directly | use honest documented values |

Minimum population pattern:

```python title="Populate Imu"
message = Imu()
message.header.stamp = self.get_clock().now().to_msg()
message.header.frame_id = 'imu_link'
message.orientation.w = 1.0
message.orientation_covariance[0] = -1.0
message.angular_velocity.x = gyro_x_rad_s
message.angular_velocity.y = gyro_y_rad_s
message.angular_velocity.z = gyro_z_rad_s
message.linear_acceleration.x = accel_x_mps2
message.linear_acceleration.y = accel_y_mps2
message.linear_acceleration.z = accel_z_mps2
```

The `orientation_covariance[0] = -1.0` marker says orientation is unavailable. Setting `orientation.w = 1.0` avoids an invalid all-zero quaternion, but it does not claim the IMU knows the robot's orientation because the covariance marker already says it does not.

## `nav_msgs/msg/Odometry`

```text title="Odometry"
Odometry
+-- header: Header
+-- child_frame_id: string
+-- pose: PoseWithCovariance
|   +-- pose: Pose
|   |   +-- position: Point
|   |   +-- orientation: Quaternion
|   +-- covariance: float64[36]
+-- twist: TwistWithCovariance
    +-- twist: Twist
    +-- covariance: float64[36]
```

`message.pose.pose` is not a typo. The outer `pose` contains a pose and covariance. The inner `pose` is the actual position and orientation. `message.twist.twist` follows the same pattern.

For this package:

- `message.header.frame_id = 'odom'`
- `message.child_frame_id = 'base_link'`
- pose is expressed in `odom`
- velocity is associated with `base_link`

```python title="Populate Odometry pose"
odom = Odometry()
odom.header.stamp = stamp
odom.header.frame_id = 'odom'
odom.child_frame_id = 'base_link'
odom.pose.pose.position.x = x
odom.pose.pose.position.y = y
odom.pose.pose.orientation.z = qz
odom.pose.pose.orientation.w = qw
odom.twist.twist.linear.x = linear_mps
odom.twist.twist.angular.z = angular_rad_s
```

## `nav_msgs/msg/Path`

```text title="Path"
Path
+-- header: Header
+-- poses: list of PoseStamped
```

`poses` is a Python sequence. Append poses and trim it so RViz does not grow forever.

```python title="Append a path pose"
pose = PoseStamped()
pose.header = odom.header
pose.pose = odom.pose.pose
self.path.header.stamp = odom.header.stamp
self.path.header.frame_id = 'odom'
self.path.poses.append(pose)
self.path.poses = self.path.poses[-self.path_max_poses:]
```

## `geometry_msgs/msg/TransformStamped`

```text title="TransformStamped"
TransformStamped
+-- header: Header
|   +-- stamp
|   +-- frame_id
+-- child_frame_id: string
+-- transform
    +-- translation: Vector3
    +-- rotation: Quaternion
```

A transform connects two frames. For odometry:

```python title="Broadcast odom to base_link"
transform = TransformStamped()
transform.header.stamp = stamp
transform.header.frame_id = 'odom'
transform.child_frame_id = 'base_link'
transform.transform.translation.x = x
transform.transform.translation.y = y
transform.transform.rotation.z = qz
transform.transform.rotation.w = qw
self.tf_broadcaster.sendTransform(transform)
```

For a fixed IMU mounting, publish or describe `base_link -> imu_link`. The transform must match the physical mounting, and you should not also rotate the raw IMU axes the same way in code.

## Parameter YAML Shape

```yaml title="config/robot.yaml"
node_name:
  ros__parameters:
    parameter_name: value
```

The outer `node_name` must match the node name in the launch file. YAML indentation matters: use spaces, not tabs.