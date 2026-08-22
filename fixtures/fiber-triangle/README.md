# Sierpinski triangle

## What is this fixture?

The Sierpinski triangle demo from the original Fiber work. A transition
re-renders thousands of dots every second while a synchronous update rescales
the container on every animation frame. Each frame interrupts the transition.

It shows whether an interrupted render continues from the work it already
finished. The counter at the top is the number of triangle renders per second.
With resuming it stays close to the number of triangles (about 1,100 for the
default size); without it, each interruption starts the transition over and the
number is many times higher while the dots lag behind the clock.

## How do I run this fixture?

```shell
# 1: Build react from source
cd /path/to/react
yarn
yarn build react-dom/index,react-dom/client,react/index,react/jsx-runtime,scheduler --type=NODE

# 2: Install fixture dependencies
cd fixtures/fiber-triangle
yarn

# 3: Copy React source code over
yarn copy-source

# 4: Run the app
yarn dev
```
