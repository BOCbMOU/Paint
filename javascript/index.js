// import { BRUSH, LINE, CIRCLE, RECTANGLE, POLYGON } from './consts';

const onWindowLoad = () => {
  // consts
  const BRUSH = 0,
    LINE = 1,
    RECTANGLE = 2,
    CIRCLE = 3,
    POLYGON = 4;

  // get saved data
  let scale = +window.localStorage.getItem('scale') || 1;
  const savedTranslate = window.localStorage.getItem('translate');
  const translate = savedTranslate
    ? JSON.parse(savedTranslate)
    : { x: 0, y: 0 };
  const savedImageData = window.localStorage.getItem('imageData');

  const imageData = savedImageData
    ? savedImageData
        .slice(1, -2)
        .split('"},{')
        .map(str => {
          if (str.indexOf('[') === -1) {
            return JSON.parse(`{${str}"}`);
          } else {
            let tempStr = str.split('[');
            tempStr = [tempStr[0], ...tempStr[1].split(']')];
            const correctObject = JSON.parse(`{${tempStr[0]}{}${tempStr[2]}"}`);
            correctObject.end = tempStr[1]
              .slice(1, -1)
              .split('},{')
              .map(str => JSON.parse(`{${str}}`));
            return correctObject;
          }
        })
    : [];

  // create canvas
  const canvas = document.getElementById('paint-canvas');
  /** @type {CanvasRenderingContext2D} */
  const ctx = canvas.getContext('2d');

  // correct canvas size
  const onResize = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    render();
  };
  window.addEventListener('resize', onResize);

  // zoom
  const onWheel = event => {
    event.preventDefault();
    if (event.deltaY < 0) {
      scale /= 0.9;
      if (scale > 5) {
        scale = 5;
      } else {
        translate.x +=
          translate.x / 0.9 - translate.x - event.pageX / 0.9 + event.pageX;
        translate.y +=
          translate.y / 0.9 - translate.y - event.pageY / 0.9 + event.pageY;
      }
    } else {
      scale *= 0.9;
      if (scale < 0.125) {
        scale = 0.125;
      } else {
        translate.x -= (translate.x - event.pageX) * 0.1;
        translate.y -= (translate.y - event.pageY) * 0.1;
      }
    }
    render();
  };
  window.addEventListener('wheel', onWheel);

  // main variables
  let isDrawing = false;
  let isTranslating = false;
  let currentShape = BRUSH;
  const brushDots = [];
  let borderWidth = 1;
  let isCurrentFill = false;
  let currentColor = '#000000';
  const currentPos = { x: 0, y: 0 };
  const templeEndPos = { x: 0, y: 0 };

  // change shape events
  const buttons = document.getElementsByClassName('select-shape');
  [...buttons].forEach((button, i) => {
    button.addEventListener('click', () => {
      currentShape = i;
    });
  });
  // change border width
  const borderSelectBox = document.getElementById('border-width');
  const spanToShowValue = document.getElementById('border-width-value');
  borderWidth = +borderSelectBox.value;
  spanToShowValue.innerHTML = borderSelectBox.value;
  const onBorderWidthChange = event => {
    borderWidth = +event.target.value;
    spanToShowValue.innerHTML = event.target.value;
  };
  borderSelectBox.addEventListener('change', onBorderWidthChange);
  // change fill state
  const fillSelectBox = document.getElementById('is-fill');
  isCurrentFill = Boolean(
    +fillSelectBox.options[fillSelectBox.selectedIndex].value
  );
  const onFillChange = event => {
    isCurrentFill = Boolean(
      +event.target.options[event.target.selectedIndex].value
    );
  };
  fillSelectBox.addEventListener('change', onFillChange);
  // change color
  const colorSelectBox = document.getElementById('shape-color');
  currentColor = `#${colorSelectBox.value}`;
  const onColorChange = event => {
    currentColor = `#${event.target.value}`;
  };
  colorSelectBox.addEventListener('change', onColorChange);
  // save image
  const saveButton = document.getElementById('save');
  const onClickSave = () => {
    const downloadLink = document.createElement('a');
    downloadLink.addEventListener('click', () => {
      downloadLink.href = canvas.toDataURL();
      downloadLink.download = 'canvas.png';
    });
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };
  saveButton.addEventListener('click', onClickSave);

  // clear canvas
  const clearCanvas = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    imageData.length = 0;
  };
  document.getElementById('clear').addEventListener('click', clearCanvas);

  // undo shape
  const onKeyDown = event => {
    if (event.ctrlKey && event.keyCode === 90) {
      imageData.pop();
      render();
    }
  };
  window.addEventListener('keydown', onKeyDown);

  // get correct mouse pos
  const getMousePos = event => {
    const x = event.pageX - canvas.offsetLeft - translate.x;
    const y = event.pageY - canvas.offsetTop - translate.y;
    return { x, y };
  };
  // mouse events
  const onMouseDown = event => {
    event.preventDefault();
    switch (event.which) {
      case 1:
        const { x, y } = getMousePos(event);
        currentPos.x = templeEndPos.x = x / scale;
        currentPos.y = templeEndPos.y = y / scale;
        isDrawing = true;
        break;
      case 2:
        currentPos.x = event.pageX;
        currentPos.y = event.pageY;
        isTranslating = true;
        break;
      // case 3:
      //   break;
      default:
        break;
    }
  };
  canvas.addEventListener('mousedown', onMouseDown);

  const onMouseMove = event => {
    if (isDrawing) {
      if (currentShape === BRUSH) {
        const { x, y } = getMousePos(event);
        brushDots.push({
          x: x / scale,
          y: y / scale,
        });
      } else {
        const { x, y } = getMousePos(event);
        templeEndPos.x = x / scale;
        templeEndPos.y = y / scale;
      }
      render();
      return;
    }
    if (isTranslating) {
      const x = event.pageX;
      const y = event.pageY;
      translate.x -= currentPos.x - x;
      translate.y -= currentPos.y - y;
      currentPos.x = x;
      currentPos.y = y;
      render();
    }
  };
  window.addEventListener('mousemove', onMouseMove);

  const onMouseUp = event => {
    event.preventDefault();
    switch (event.which) {
      case 1:
        const { x, y } = getMousePos(event);
        imageData.push({
          shape: currentShape,
          start: { x: currentPos.x, y: currentPos.y },
          end:
            currentShape === BRUSH
              ? [...brushDots]
              : {
                  x: x / scale,
                  y: y / scale,
                },
          lineWidth: borderWidth,
          isFill: isCurrentFill,
          color: currentColor,
        });
        isDrawing = false;
        brushDots.length = 0;
        render();
        break;
      case 2:
        isTranslating = false;
        break;
      // case 3:
      //   break;
      default:
        break;
    }
  };
  canvas.addEventListener('mouseup', onMouseUp);

  // rendering
  const render = () => {
    ctx.save();
    ctx.translate(translate.x, translate.y);
    ctx.clearRect(-translate.x, -translate.y, canvas.width, canvas.height);
    ctx.scale(scale, scale);
    for (const shape of imageData) {
      renderShape(shape);
    }
    if (isDrawing) {
      renderShape({
        shape: currentShape,
        start: currentPos,
        end: currentShape === BRUSH ? brushDots : templeEndPos,
        lineWidth: borderWidth,
        isFill: isCurrentFill,
        color: currentColor,
      });
    }
    ctx.restore();
  };

  const renderShape = ({ shape, start, end, lineWidth, isFill, color }) => {
    ctx.save();
    ctx.beginPath();
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    switch (shape) {
      case BRUSH:
        ctx.moveTo(start.x, start.y);
        for (const dot of end) {
          ctx.lineTo(dot.x, dot.y);
        }
        ctx.stroke();
        break;
      case LINE:
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
        break;
      case RECTANGLE:
        ctx.rect(start.x, start.y, end.x - start.x, end.y - start.y);
        if (isFill) {
          ctx.fill();
        } else {
          ctx.stroke();
        }
        break;
      case CIRCLE:
        ctx.arc(
          start.x,
          start.y,
          Math.sqrt((end.x - start.x) ** 2 + (end.y - start.y) ** 2),
          0,
          2 * Math.PI
        );
        if (isFill) {
          ctx.fill();
        } else {
          ctx.stroke();
        }
        break;
      case POLYGON:
        break;
      default:
        break;
    }
    ctx.restore();
  };

  onResize();

  // save on unload
  const onUnload = () => {
    if (imageData.length) {
      window.localStorage.setItem(
        'imageData',
        imageData.map(shape => JSON.stringify(shape)).toString()
      );
      window.localStorage.setItem('scale', scale);
      window.localStorage.setItem('translate', JSON.stringify(translate));
    } else {
      window.localStorage.clear();
    }
  };
  window.addEventListener('unload', onUnload);
};

window.addEventListener('load', onWindowLoad);
