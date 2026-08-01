---
title: Event-Based Keyboard Teleop
description: Optional Tk keyboard teleop for press-and-release driving on systems where terminal key repeat feels bad.
---

Standard `teleop_twist_keyboard` is the required first teleop tool for this guide. Use this extra only if you want a small GUI window that publishes movement while a key is physically held and sends stop commands when it is released.

This is optional reused utility code. It is not your required autonomous routine, and it is *not a reason to copy the whole OrphBot package into your submission.*

## What You Will Reuse

The OrphBot package includes a Tk teleop node at:

```text
orphbot/orphbot/keyboard_teleop.py
```

That file publishes `geometry_msgs/msg/Twist` on `cmd_vel`, uses W/S/A/D for movement, Space or X for stop, plus/minus for speed changes, and Q to quit. The repository is MIT licensed, so include the license notice or attribution required by that license if you reuse the file.

## Install Tk

Run this on the computer that will drive the robot:

```bash title="Computer Ubuntu terminal"
sudo apt update
sudo apt install -y python3-tk
```

On WSL, this also needs a working GUI display such as WSLg.

## Copy Only the Teleop File

Use a separate example folder so your robot package stays yours.

```bash title="Computer Ubuntu terminal"
WORKSPACE_NAME="cool_rover_ws"
PACKAGE_NAME="cool_rover"

cd ~
git clone https://github.com/SharKingStudios/orphbot-package.git orphbot-example
cp \
  ~/orphbot-example/orphbot/orphbot/keyboard_teleop.py \
  ~/"$WORKSPACE_NAME"/src/"$PACKAGE_NAME"/"$PACKAGE_NAME"/keyboard_teleop.py
```

Do not copy OrphBot's motor node, IMU node, odometry node, launch files, or config as your submission. This extra is only about reusing one desktop teleop utility.

## Review Before Running

Open your copied `keyboard_teleop.py` and check:

- the node name is `keyboard_teleop`
- it creates a publisher for `cmd_vel`
- `W`, `S`, `A`, and `D` set `linear.x` and `angular.z`
- the stop function publishes zero motion
- the window title can be changed if you want it to show your robot name

## Add the Executable

Add a `console_scripts` entry in your `setup.py`.

```python title="setup.py excerpt"
entry_points={
    'console_scripts': [
        'event_teleop = cool_rover.keyboard_teleop:main',
    ],
},
```

Build and source the workspace:

```bash title="Computer Ubuntu terminal"
WORKSPACE_NAME="cool_rover_ws"
PACKAGE_NAME="cool_rover"

cd ~/"$WORKSPACE_NAME"
source /opt/ros/jazzy/setup.bash
colcon build --symlink-install
source install/setup.bash
ros2 pkg executables "$PACKAGE_NAME"
```

Expected result: the executable list includes `cool_rover event_teleop` if you used the example names.

## Run It

Use this after your robot-side motor node and watchdog are working.

```bash title="Computer Ubuntu terminal"
PACKAGE_NAME="cool_rover"
ros2 run "$PACKAGE_NAME" event_teleop
```

Focus the small window. Hold `W`, `S`, `A`, or `D` to publish movement. Release keys to stop that direction. Press Space or X for an immediate stop burst. Press Q to quit.

Before driving on the floor, inspect the command stream:

```bash title="Second computer Ubuntu terminal"
ros2 topic info /cmd_vel --verbose
ros2 topic echo /cmd_vel
```

Only one command publisher should be active during normal driving unless you wrote a command arbiter or mux. Keep the robot-side watchdog enabled even when this teleop works perfectly.