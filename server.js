const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

let mouseControllerReady = null;

async function initMouseController() {
  try {
    const robot = require("robotjs");
    return {
      type: "robotjs",
      getPos() {
        return robot.getMousePos();
      },
      move(dx, dy) {
        const pos = robot.getMousePos();
        robot.moveMouse(pos.x + dx, pos.y + dy);
      },
      leftClick() {
        robot.mouseClick("left");
      },
      rightClick() {
        robot.mouseClick("right");
      }
    };
  } catch (err) {
    // fall through to nut-js
  }

  try {
    const nut = await import("@nut-tree-fork/nut-js");
    const { mouse, Button, Point } = nut;
    return {
      type: "nut-js",
      async getPos() {
        return mouse.getPosition();
      },
      async move(dx, dy) {
        const pos = await mouse.getPosition();
        await mouse.setPosition(new Point(pos.x + dx, pos.y + dy));
      },
      async leftClick() {
        await mouse.click(Button.LEFT);
      },
      async rightClick() {
        await mouse.click(Button.RIGHT);
      }
    };
  } catch (err) {
    console.warn("No mouse controller available; mouse control is disabled.");
    return null;
  }
}

mouseControllerReady = initMouseController();

io.on('connection', (socket) => {
  console.log('A user connected');

  socket.on('mouseEvent', async (data) => {
    const mouseController = await mouseControllerReady;
    if (!mouseController) return;
    const { event, dx, dy } = data;
    if (event === 'move') {
      await mouseController.move(dx, dy);
    }
  });

  socket.on('mouseAction', async (data) => {
    const mouseController = await mouseControllerReady;
    if (!mouseController) return;
    const { action } = data;
    if (action === 'left_click') {
      await mouseController.leftClick();
    } else if (action === 'right_click') {
      await mouseController.rightClick();
    }
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected');
  });
});

const port = 6969;
http.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
