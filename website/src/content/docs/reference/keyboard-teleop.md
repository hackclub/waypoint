---
title: Event-Based Keyboard Teleop
description: An optional ROS 2 keyboard teleop that stops on actual key release instead of OS key-repeat behavior.
---

This is an optional polish feature. Standard [`teleop_twist_keyboard`](https://github.com/ros2/teleop_twist_keyboard) already speaks `/cmd_vel` and is perfectly ok for your submission.

The complete node below is provided because terminal key handling has a limitation (at least in Windows WSL): terminals receive characters and operating-system key repeat, not key-release events. This version opens a small Tk window and uses press/release events instead. Holding a movement key publishes movement. Releasing it schedules a stop. Space sends an immediate stop (in case something went wrong).

## Install the Tiny GUI Dependency

On the computer that will drive the robot, install Tk once:

```bash title="Ubuntu terminal"
sudo apt update
sudo apt install -y python3-tk
```

Create `keyboard_teleop.py` inside your package's inner Python module. Add a `console_scripts` entry in your existing `setup.py` using the pattern below, substituting your actual names:

```python title="setup.py pattern"
'<teleop_command> = <package_name>.keyboard_teleop:main',
```

## The Node

```python title="keyboard_teleop.py"
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
        self.declare_parameter('angular_speed', 0.7)
        self.declare_parameter('publish_rate', 15.0)
        self.declare_parameter('release_debounce_ms', 80)
        self.declare_parameter('stop_burst', 3)

        self.publisher = self.create_publisher(Twist, '/cmd_vel', 10)
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
        # A brief delay lets the next physical-repeat press cancel it.
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

## Build and Drive

Build from the workspace root and source it in the terminal that runs teleop:

```bash title="Computer Ubuntu terminal"
cd ~/<workspace_name>
source /opt/ros/jazzy/setup.bash
colcon build --symlink-install
source install/setup.bash
ros2 run <package_name> <teleop_command>
```

Focus the small window. Hold `W`, `S`, `A`, or `D`; release the key to stop that motion. `W` plus `A` produces a forward curve. Press Space to immediately clear all held keys and send several zero commands. 

:::caution[Warning]
The robot-side motor watchdog should still exist as a separate safety layer to stop the robot if the teleop disconnects.
:::

The provided node is intentionally generic. Read it, change its title, keys, or speed parameters if you like.
