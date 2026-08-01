---
title: Add Teleop and Autonomy
description: Make your package compatible with normal ROS teleop and add a small routine of your own.
---

Your motor node already accepts `/cmd_vel`, so it is compatible with normal ROS teleop messages! What you will also do here is create a script to inject custom `/cmd_vel` messages to make your robot move on its own.

## Teleop Compatibility

Install and use the standard ROS keyboard teleop later with your robot:

```bash title="Ubuntu terminal"
sudo apt install -y ros-jazzy-teleop-twist-keyboard
ros2 run teleop_twist_keyboard teleop_twist_keyboard
```

It publishes `Twist` commands, which is exactly why your motor node subscribes to `/cmd_vel`.

For a more responsive driving experience on Windows and other desktop environments, the optional [event-based keyboard teleop reference](/reference/keyboard-teleop/) provides a complete generic node. It uses actual key press and release events instead of treating key repeat as movement.

## Write Your Autonomous Routine

Create your own node that publishes `Twist` messages to `/cmd_vel`. A short timed routine is enough: wait briefly, move, stop, turn, stop, and move again. Choose the route, names, speeds, durations, and purpose yourself! Make it do something fun!

Use a timer rather than blocking `sleep()` calls. Keep a list of movement segments and the time the current segment started. Each timer tick should publish the current segment's command, move to the next segment when its duration expires, and publish zero when the sequence ends.

Your node must always publish a zero `Twist`:

- before the first movement segment
- between movement segments
- after the last segment
- when the node receives `Ctrl+C`

Keep speeds and durations as parameters or YAML configuration, not unexplained constants in the callback.

## Add It to the Package

Add an executable entry for the autonomous node. Choose whether your autonomous routine starts from its own launch file or as a separate `ros2 run` command after normal bringup. Keep teleop and autonomy as separate commands unless you intentionally add a command arbiter.

The relevant official references are [ROS 2 timers in Python](https://docs.ros.org/en/jazzy/Tutorials/Beginner-Client-Libraries/Writing-A-Simple-Py-Publisher-And-Subscriber.html) and the broader [ROS 2 beginner tutorials](https://docs.ros.org/en/jazzy/Tutorials/Beginner-CLI-Tools.html).

With teleop compatibility and your autonomous node in place, finish with [Polishing your package](/guides/ros2-package-guide/polish/).
