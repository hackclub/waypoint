---
title: Add Teleop and Autonomy
description: Make your package compatible with normal ROS teleop and add a small routine of your own.
---

Your motor node already accepts `cmd_vel`, so it can work with normal ROS teleop messages. In this page you will also add your own autonomous node that publishes `Twist` commands.

Teleop and autonomy both ask for movement. They should not publish at the same time unless you deliberately add a command arbiter or mux.

## Use Standard Teleop First

The standard keyboard teleop package already publishes `geometry_msgs/msg/Twist`, which is why your motor node subscribes to `cmd_vel`.

```bash title="Ubuntu terminal"
sudo apt update
sudo apt install -y ros-jazzy-teleop-twist-keyboard
source /opt/ros/jazzy/setup.bash
ros2 run teleop_twist_keyboard teleop_twist_keyboard
```

This is the first manual driving tool to use during robot bringup. It proves that your package speaks the same movement interface as normal ROS tools.

## Optional Event-Based Teleop

Terminal teleop can feel odd in WSL or some desktop environments because terminals see characters and operating-system key repeat, not clean key-release events. If you want press-and-release driving, add this optional Tk-based teleop node to your package.

Install Tk on the computer that will drive the robot:

```bash title="Computer Ubuntu terminal"
sudo apt update
sudo apt install -y python3-tk
```

Create `keyboard_teleop.py` inside your package's inner Python module. For a package named `cool_rover`, the path from the package root is `cool_rover/keyboard_teleop.py`; from the workspace `src/` folder, it is `cool_rover/cool_rover/keyboard_teleop.py`.

```python title="cool_rover/keyboard_teleop.py"
import time
import tkinter as tk

from geometry_msgs.msg import Twist
import rclpy
from rclpy.node import Node


MOTION_KEYS = {'w', 's', 'a', 'd'}


class KeyboardTeleop(Node):
    def __init__(self):
        super().__init__('keyboard_teleop')
        self.declare_parameter('linear_speed', 0.18)
        self.declare_parameter('angular_speed', 0.70)
        self.declare_parameter('publish_rate', 15.0)
        self.declare_parameter('release_debounce_ms', 80)
        self.declare_parameter('stop_burst', 3)

        self.publisher = self.create_publisher(Twist, 'cmd_vel', 10)
        self.linear_speed = float(self.get_parameter('linear_speed').value)
        self.angular_speed = float(self.get_parameter('angular_speed').value)
        self.period = 1.0 / max(1.0, float(self.get_parameter('publish_rate').value))
        self.release_debounce_ms = int(self.get_parameter('release_debounce_ms').value)
        self.stop_burst = int(self.get_parameter('stop_burst').value)

        self.active_keys = set()
        self.pending_releases = {}
        self.last_publish = 0.0
        self.stops_remaining = 0

    def publish(self, linear=0.0, angular=0.0):
        message = Twist()
        message.linear.x = linear
        message.angular.z = angular
        self.publisher.publish(message)
        self.last_publish = time.monotonic()

    def desired_motion(self):
        linear = 0.0
        angular = 0.0
        if 'w' in self.active_keys:
            linear += self.linear_speed
        if 's' in self.active_keys:
            linear -= self.linear_speed
        if 'a' in self.active_keys:
            angular += self.angular_speed
        if 'd' in self.active_keys:
            angular -= self.angular_speed
        return linear, angular

    def key_down(self, root, key):
        key = key.lower()
        pending = self.pending_releases.pop(key, None)
        if pending is not None:
            root.after_cancel(pending)

        if key in MOTION_KEYS:
            self.active_keys.add(key)
            self.stops_remaining = 0
        elif key in {'space', 'x'}:
            self.stop(root)
        elif key == 'q':
            self.stop(root)
            root.destroy()

    def key_up(self, root, key):
        key = key.lower()
        if key not in MOTION_KEYS:
            return

        # Some desktop stacks emit a release between repeat presses.
        pending = self.pending_releases.pop(key, None)
        if pending is not None:
            root.after_cancel(pending)
        self.pending_releases[key] = root.after(
            self.release_debounce_ms,
            lambda: self.finish_release(key),
        )

    def finish_release(self, key):
        self.pending_releases.pop(key, None)
        self.active_keys.discard(key)
        if not self.active_keys:
            self.stop()

    def stop(self, root=None):
        self.active_keys.clear()
        if root is not None:
            for pending in self.pending_releases.values():
                root.after_cancel(pending)
        self.pending_releases.clear()
        self.stops_remaining = max(1, self.stop_burst)
        self.publish()
        self.stops_remaining -= 1

    def tick(self):
        now = time.monotonic()
        if self.active_keys:
            if now - self.last_publish >= self.period:
                self.publish(*self.desired_motion())
        elif self.stops_remaining and now - self.last_publish >= self.period:
            self.publish()
            self.stops_remaining -= 1


def key_name(event):
    if event.keysym == 'space':
        return 'space'
    return event.char.lower() if event.char else event.keysym.lower()


def make_window(node):
    root = tk.Tk()
    root.title('ROS 2 Teleop')
    root.geometry('420x150')
    root.resizable(False, False)
    tk.Label(
        root,
        text='Focus this window. Hold W/S/A/D to drive. Space stops. Q quits.',
        padx=16,
        pady=16,
        wraplength=380,
    ).pack(fill='both', expand=True)

    root.bind('<KeyPress>', lambda event: node.key_down(root, key_name(event)))
    root.bind('<KeyRelease>', lambda event: node.key_up(root, key_name(event)))
    root.protocol('WM_DELETE_WINDOW', lambda: (node.stop(root), root.destroy()))
    root.focus_force()
    return root


def main(args=None):
    rclpy.init(args=args)
    node = KeyboardTeleop()
    root = make_window(node)

    def spin_once():
        if rclpy.ok():
            rclpy.spin_once(node, timeout_sec=0.0)
            node.tick()
            root.after(20, spin_once)

    try:
        root.after(20, spin_once)
        root.mainloop()
    except KeyboardInterrupt:
        pass
    finally:
        node.stop()
        node.destroy_node()
        if rclpy.ok():
            rclpy.shutdown()


if __name__ == '__main__':
    main()
```

Add a `console_scripts` entry in `setup.py`. This example uses the command `event_teleop`; replace `cool_rover` with your package name.

```python title="setup.py excerpt"
entry_points={
    'console_scripts': [
        'event_teleop = cool_rover.keyboard_teleop:main',
    ],
},
```

Build from the workspace root and run it from the computer that will drive the robot:

```bash title="Computer Ubuntu terminal"
WORKSPACE_NAME="cool_rover_ws"
PACKAGE_NAME="cool_rover"
TELEOP_COMMAND="event_teleop"

cd ~/"$WORKSPACE_NAME"
source /opt/ros/jazzy/setup.bash
colcon build --symlink-install
source install/setup.bash
ros2 run "$PACKAGE_NAME" "$TELEOP_COMMAND"
```

Focus the small window. Hold `W`, `S`, `A`, or `D`; release the key to stop that motion. Space sends an immediate stop burst, and `Q` quits.

:::caution[Keep the watchdog]
This teleop node is only a command publisher. The robot-side motor watchdog should still stop the robot if teleop disconnects or the network fails.
:::

## Write Your Autonomous Routine

Create your own node that publishes `Twist` messages to `cmd_vel`. A short timed routine is enough: wait briefly, move, stop, turn, stop, and move again. Choose the route, names, speeds, durations, and purpose yourself.

Use a timer rather than blocking `sleep()` calls. Keep a list of movement segments and the time the current segment started. Each timer tick should publish the current segment's command, move to the next segment when its duration expires, and publish zero when the sequence ends.

A good segment table has this shape:

| Segment | Linear x | Angular z | Duration | Why |
| --- | --- | --- | --- | --- |
| settle | `0.00 m/s` | `0.00 rad/s` | `1.0 s` | prove startup zero |
| forward | your value | `0.00 rad/s` | your value | first move |
| stop | `0.00 m/s` | `0.00 rad/s` | `0.5 s` | separate commands |
| turn | `0.00 m/s` | your value | your value | change heading |

Your node must always publish a zero `Twist`:

- before the first movement segment
- between movement segments
- after the last segment
- when the node receives `Ctrl+C`

Keep speeds and durations as parameters or YAML configuration, not unexplained constants in the callback. Validate that values are finite and inside the safe ranges you chose for your robot.

## Add It to the Package

Add an executable entry for the autonomous node. Choose whether your autonomous routine starts from its own launch file or as a separate `ros2 run` command after normal bringup. Keep teleop and autonomy as separate commands unless you intentionally add a command arbiter.

Before running autonomy on the real robot, use the bringup guide to check that `/cmd_vel` has only the publisher you expect:

```bash title="Ubuntu terminal"
ros2 topic info /cmd_vel --verbose
```

The relevant official references are [ROS 2 timers in Python](https://docs.ros.org/en/jazzy/Tutorials/Beginner-Client-Libraries/Writing-A-Simple-Py-Publisher-And-Subscriber.html) and the broader [ROS 2 beginner tutorials](https://docs.ros.org/en/jazzy/Tutorials/Beginner-CLI-Tools.html).

With teleop compatibility and your autonomous node in place, finish with [Polishing your package](/guides/ros2-package-guide/polish/).
