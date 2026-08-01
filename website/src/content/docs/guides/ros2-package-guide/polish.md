---
title: Polish Your Package
description: Make the package easy to understand and enjoyable to use before you submit it.
---

Your package is not complete merely because the files exist. It is ready when it builds, ROS can discover its executables and assets from `install/`, the safety behavior is documented, and the remaining hardware choices are easy to find.

## Make the Repository Readable

A reviewer should be able to open the repository and quickly find:

- your ROS package source
- `config/` values for motor channels, limits, IMU settings, and dead-reckoning scales
- `launch/` files for normal bringup and your autonomous routine
- a README explaining what the robot does, its package layout, and how the nodes connect
- the chassis CAD and PCB files required for submission

A small topic diagram in the README is useful. Show teleop and autonomy feeding `/cmd_vel`, then the motor driver and odometry subscribing to it, with the IMU publishing separately.

## Confirm Package Metadata

Update `package.xml` and `setup.py` so they describe your project instead of the generated starter package.

Check these fields before submitting:

| File | Field | What it should say |
| --- | --- | --- |
| `package.xml` | `name` | your lowercase ROS package name |
| `package.xml` | `description` | what your robot package does |
| `package.xml` | `maintainer` | your name and a real contact if you want to include one |
| `package.xml` | `license` | the license you chose, such as `MIT` |
| `package.xml` | dependencies | the ROS and system packages your imports actually use |
| `setup.py` | `console_scripts` | one entry for each command you expect `ros2 run` to find |
| `setup.py` | `data_files` | installed launch, config, URDF, mesh, and RViz files |

## Install Your Assets

ROS launch files should find configuration by package name, not by hardcoded paths into your source folder. That only works if `setup.py` installs the asset folders into the package share directory.

For a package named `cool_rover`, a typical `setup.py` starts with these imports and data files. Replace the package name and include only the folders your package actually has.

```python title="setup.py excerpt"
from glob import glob
import os

from setuptools import setup

package_name = 'cool_rover'

setup(
    name=package_name,
    data_files=[
        ('share/ament_index/resource_index/packages', ['resource/' + package_name]),
        ('share/' + package_name, ['package.xml']),
        (os.path.join('share', package_name, 'launch'), glob('launch/*.launch.py')),
        (os.path.join('share', package_name, 'config'), glob('config/*.yaml')),
        (os.path.join('share', package_name, 'urdf'), glob('urdf/*.urdf')),
        (os.path.join('share', package_name, 'meshes'), glob('meshes/*')),
        (os.path.join('share', package_name, 'rviz'), glob('rviz/*.rviz')),
    ],
)
```

After rebuilding, prove ROS can find the package and launch file from the installed workspace:

```bash title="Ubuntu terminal"
WORKSPACE_NAME="cool_rover_ws"
PACKAGE_NAME="cool_rover"

cd ~/"$WORKSPACE_NAME"
source /opt/ros/jazzy/setup.bash
colcon build --symlink-install
source install/setup.bash
ros2 pkg prefix "$PACKAGE_NAME"
ros2 pkg executables "$PACKAGE_NAME"
ros2 launch "$PACKAGE_NAME" bringup.launch.py --show-args
```

## Improve the Driving Experience

Use descriptive parameter names, keep an obvious maximum output limit, and document your dead-reckoning assumptions. The optional event-based teleop node in [Add Teleop and Autonomy](/guides/ros2-package-guide/autonomy/#optional-event-based-teleop) is a good extra if you want press/release driving instead of standard terminal key repeat.

## Add a Robot Model in RViz

An STL of your own chassis can make RViz easier to understand. This is optional polish; the robot does not need an animated wheel model or a joint-state publisher for parts you are not controlling.

Keep the editable assembly in your repository's CAD folder as a `.step` or native CAD file. RViz does not render STEP directly from a URDF, so export a separate STL for viewing and place it under `meshes/` in the ROS package.

Before exporting, check:

- the model is the assembled chassis, not a random test body
- its forward direction matches your chosen `base_link` x axis
- its unit scale is known; many CAD tools export STL in millimeters while ROS uses meters
- the mesh is small enough to load quickly

A basic robot can have one URDF link named `base_link` with a visual mesh. This example assumes a package named `cool_rover` and a millimeter-scale STL named `chassis.stl`; replace both values with yours.

```xml title="urdf/robot.urdf fragment"
<visual>
  <geometry>
    <mesh filename="package://cool_rover/meshes/chassis.stl" scale="0.001 0.001 0.001" />
  </geometry>
</visual>
```

Measure the result in RViz and set the scale that matches your export. Do not add a cube fallback: if the model is missing, fix the path or add your real STL.

Put the URDF under `urdf/`, install both `urdf/` and `meshes/` through `setup.py`, and launch `robot_state_publisher` with the URDF supplied as its `robot_description` parameter. The official [URDF and robot_state_publisher tutorial](https://docs.ros.org/en/jazzy/Tutorials/Intermediate/URDF/Using-URDF-with-Robot-State-Publisher.html) shows the complete ROS plumbing.

A single fixed `base_link` visual does not need a joint-state publisher. It also does not need modeled wheels, an IMU visual, or a pretend suspension. Add a link only when it has a meaningful transform or visible role in your project.

During robot bringup, use RViz with `odom` as the fixed frame. Add **RobotModel** to view the STL and **Axes** set to `base_link` when you want to see the robot's own orientation.

## Write Down the Decisions

Add a short design note to your README covering:

- your motor driver and how the left/right motor requests are mixed
- why your output limit and watchdog values make sense
- the IMU's orientation in the chassis and the frame you publish
- how open-loop dead reckoning works on the encoder-free kit
- what your autonomous routine does and why you chose it
- which checks passed during physical bringup

Those notes are proof that the package is your work and make robot debugging much smoother.

## Submission Check

Before you submit, confirm that your repository contains source code you can explain for all of these:

| Required part | What should be in your package |
| --- | --- |
| Motor control | `/cmd_vel` subscription, motor-driver logic, limits, watchdog, configuration |
| Dead reckoning | `/cmd_vel` integration, `/odom`, `/path`, TF, scale configuration |
| IMU | I2C reader, unit conversion, `/imu/data_raw`, sensor configuration |
| Teleop | standard `/cmd_vel` compatibility; optional event-based teleop is fine |
| Autonomous behavior | a node that publishes your own timed `Twist` sequence and stops safely |
| Bringup | launch/config files that show how the nodes fit together |
| Documentation | README notes for wiring, limits, IMU orientation, safety checks, and limitations |

After your kit arrives, use [Put Your Package on a Robot](/guides/robot-bringup/) to bring this source package to real hardware.
