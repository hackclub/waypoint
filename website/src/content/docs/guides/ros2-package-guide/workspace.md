---
title: Create Your Workspace
description: Set up the base files of your Python ROS 2 package.
---

You are starting a Python ROS 2 package. Its base is a workspace, the package folder, package metadata, and the setup instructions ROS uses to find your nodes.

## Pick Names for Your Project

Choose a workspace folder and a lower-case package name before creating anything. For example, someone might choose `yard_rover_ws` and `yard_rover`. These are examples, not names you need to use. (In fact I encourage you to get creative with this!)

Package names should use lower-case letters, numbers, and underscores. Pick something that identifies your robot instead of a generic name such as `test`.

## Create the Scaffold

In your Ubuntu terminal, replace the placeholders with your own names:

```bash title="Ubuntu terminal"
mkdir -p ~/<workspace_name>/src
cd ~/<workspace_name>/src
ros2 pkg create --build-type ament_python --license MIT <package_name> --dependencies rclpy geometry_msgs sensor_msgs nav_msgs tf2_ros
```

`ament_python` makes this a Python package. The dependencies here cover the message types this guide uses; add more only when your code needs them.

Open the workspace in VS Code. On Windows, use the Remote - WSL window so VS Code edits the Ubuntu files directly.

## Know the Package Files

The generated package contains the base files you will extend:

| File or folder | Purpose |
| --- | --- |
| `<package_name>/` | Python module that holds your nodes, such as `motor_driver.py` and `imu_node.py`. |
| `package.xml` | Package name, description, license, maintainer, and ROS dependencies. |
| `setup.py` | Python installation settings and the `ros2 run` commands your package exports. |
| `setup.cfg` | The location where ROS expects installed Python executables. |
| `resource/` | The package-index marker ROS uses to find the package. |

Update the generated author, email (you can omit this if you like), description, and license metadata before you submit. For a field-by-field explanation, use the official [ROS 2 Python package guide](https://docs.ros.org/en/jazzy/How-To-Guides/Developing-a-ROS-2-Package.html).

## Add the Folders You Will Need

Create folders in your package for the parts of your project:

```text
<package_name>/
  <package_name>/       Python nodes
  config/               pins, limits, and tuning values
  launch/               bringup and autonomous launch files
```

The `config/` folder is for values that follow your physical build: motor-driver channels, inversion flags, output limits, I2C address, IMU orientation, and timing. Keep those values out of the middle of your node logic.

You can add `urdf/` and `meshes/` later as polish; they are not required for this package milestone.

## Export Your First Node

Each Python node needs a `main()` function and a matching line in `setup.py` so ROS can run it. The pattern is:

```python title="setup.py pattern"
'<command_name> = <package_name>.<module_name>:main',
```

For example, a module named `motor_driver.py` will eventually expose a command that points to `motor_driver:main`. Read the official example, then add one entry for every node you create. A typo in this line is why `ros2 run` cannot find many otherwise-correct nodes.

## Build the Package

Build from the workspace root whenever you change package metadata, add a launch/config file, or add an executable:

```bash title="Ubuntu terminal"
cd ~/<workspace_name>
source /opt/ros/jazzy/setup.bash
colcon build --symlink-install
source install/setup.bash
```

`colcon` creates `build/`, `install/`, and `log/`. `install/` is the built workspace ROS uses. `--symlink-install` keeps Python edits easy to iterate on while you are writing the package.

When the build completes, your scaffold is ready for robot nodes. Continue to [Build movement nodes](/guides/ros2-package-guide/driving/).
