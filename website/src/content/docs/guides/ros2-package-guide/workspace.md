---
title: Create Your Workspace
description: Set up the base files of your Python ROS 2 package.
---

You are starting a Python ROS 2 package. Its base is a workspace, the package folder, package metadata, and the setup instructions ROS uses to find your nodes and assets.

## Pick Names for Your Project

Choose a workspace folder and a lowercase package name before creating anything. For example, someone might choose `cool_rover_ws` and `cool_rover`. These are examples, not names you need to use. (In fact I encourage you to get creative with this!)

:::tip[Package names]
ROS package names should only use lowercase letters, numbers, and underscores. Pick something that identifies your robot instead of a generic name such as `test`.
:::

## Create the Scaffold

Run these commands in your Ubuntu terminal. Change the two values at the top to match the name you picked.

```bash title="Ubuntu terminal"
WORKSPACE_NAME="cool_rover_ws"
PACKAGE_NAME="cool_rover"

mkdir -p ~/"$WORKSPACE_NAME"/src
cd ~/"$WORKSPACE_NAME"/src
ros2 pkg create --build-type ament_python --license MIT "$PACKAGE_NAME" --dependencies rclpy geometry_msgs sensor_msgs nav_msgs tf2_ros
```

`ament_python` makes this a Python package. The dependencies here cover the message types this guide uses; add more only when your code needs them.

Open the workspace in VS Code. On Windows, use the Remote - WSL window so VS Code edits the Ubuntu files directly.

## Know the Package Files

The generated package contains the base files you will extend. If your package is named `cool_rover`, the important paths would look like this:

```text title="Package layout"
cool_rover_ws/
  src/
    cool_rover/
      cool_rover/          Python module that holds your nodes
      package.xml          package metadata and ROS dependencies
      setup.py             installation rules and ros2 run commands
      setup.cfg            installed Python executable location
      resource/cool_rover  package-index marker
```

Update the generated author, description, and license metadata before you submit. A maintainer email can be a real email, a project contact, or omitted if you do not want to publish one. For a field-by-field explanation, use the official [ROS 2 Python package guide](https://docs.ros.org/en/jazzy/How-To-Guides/Developing-a-ROS-2-Package.html).

## Add Project Folders

Create folders in your package for the parts of your project:

```bash title="Ubuntu terminal"
cd ~/"$WORKSPACE_NAME"/src/"$PACKAGE_NAME"
mkdir -p config launch urdf meshes rviz
```

Use these folders for:

| Folder | Purpose |
| --- | --- |
| `config/` | pins, motor-driver channels, inversion flags, limits, I2C address, IMU orientation, timing |
| `launch/` | bringup and autonomous launch files |
| `urdf/` | optional robot description files for RViz |
| `meshes/` | optional STL files used by the URDF |
| `rviz/` | optional saved RViz display layouts |

Keep physical values in configuration files instead of burying them in node callbacks. That makes bringup safer because you can change wiring, inversion, and limits without rewriting control logic.

## Export Your First Node

A node is a running program. A Python file sitting on disk is not a ROS node until you build the package and run its executable.

Create a tiny first node so you can prove `console_scripts` works before adding hardware code. Put this file inside the inner Python module. For the example package, the path is `cool_rover/cool_rover/hello_node.py`.

```python title="cool_rover/hello_node.py"
import rclpy
from rclpy.node import Node


class HelloNode(Node):
    def __init__(self):
        super().__init__('hello_node')
        self.get_logger().info('Hello from my Waypoint package')


def main(args=None):
    rclpy.init(args=args)
    node = HelloNode()
    try:
        rclpy.spin_once(node, timeout_sec=0.5)
    finally:
        node.destroy_node()
        rclpy.shutdown()


if __name__ == '__main__':
    main()
```

Each Python node needs a `main()` function and a matching line in `setup.py` so ROS can run it. For the example package, add this entry:

```python title="setup.py excerpt"
entry_points={
    'console_scripts': [
        'hello = cool_rover.hello_node:main',
    ],
},
```

Later you will add entries for your motor driver, open-loop odometry, IMU publisher, teleop, and autonomy nodes. A typo in `console_scripts` is why `ros2 run` cannot find many otherwise-correct nodes.

## Install Launch and Config Assets

The folders you created are source folders until `setup.py` installs them. ROS launch should load files from the package share directory, not from a hardcoded path into your workspace.

Add `glob` and `os` imports near the top of `setup.py`, then include the asset folders in `data_files`.

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

The package share directory is where installed non-Python files live. Later, launch files can use `get_package_share_directory('cool_rover')` to find config files after the package is built on either your computer or the Raspberry Pi.

## Build the Package

Build from the workspace root whenever you change package metadata, add a launch/config file, or add an executable:

```bash title="Ubuntu terminal"
cd ~/"$WORKSPACE_NAME"
source /opt/ros/jazzy/setup.bash
colcon build --symlink-install
source install/setup.bash
```

`source /opt/ros/jazzy/setup.bash` loads the ROS 2 underlay for the current terminal. `source install/setup.bash` loads your workspace overlay, which is how this terminal learns about the package you just built. **A fresh terminal needs both commands again.**

`colcon` creates `build/`, `install/`, and `log/`. `install/` is the built workspace ROS uses. `--symlink-install` keeps Python edits easy to iterate on while you are writing the package.

## Check Discovery

Run these commands from the same sourced terminal:

```bash title="Ubuntu terminal"
ros2 pkg prefix "$PACKAGE_NAME"
ros2 pkg executables "$PACKAGE_NAME"
ros2 run "$PACKAGE_NAME" hello
```

Expected result:

- `ros2 pkg prefix` prints a path inside your workspace's `install/` folder
- `ros2 pkg executables` lists `cool_rover hello` if you used the example names
- `ros2 run` prints `Hello from my Waypoint package`

If `ros2 run` cannot find the executable, check that the `console_scripts` line uses the exact package, module, and `main` function names. If ROS cannot find the package at all, rebuild from the workspace root and source `install/setup.bash` again.

When the build completes and discovery works, your scaffold is ready for robot nodes. Continue to [Build movement nodes](/guides/ros2-package-guide/driving/).
