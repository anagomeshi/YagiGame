const boardWidth = 9;
const boardHeight = 9;

let board = [];
let selectedCell = null;

const completeCells = new Set();
const lineMap = new Map();

class Cell {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.neighbors = [];
        this.connections = [];
        this.playerConnections = [];
    }
}

const boardElement = document.querySelector(".board-content");

function createBoard(width, height) {
    board = [];
    selectedCell = null;
    completeCells.clear();
    lineMap.clear();
    boardElement.innerHTML = "";

    const svg = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "svg"
    );
    svg.classList.add("connection-layer");
    boardElement.appendChild(svg);

    for (let y = 0; y < height; y++) {
        const row = document.createElement("div");
        row.classList.add("board-row");
        board[y] = [];

        for (let x = 0; x < width; x++) {
            const cell = new Cell(x, y);
            const button = document.createElement("button");

            board[y][x] = cell;

            button.classList.add("board-button");
            button.cell = cell;
            button.addEventListener("click", () => onCellClicked(cell));

            row.appendChild(button);
        }

        boardElement.appendChild(row);
    }

    setupNeighbors(width, height);
    generateConnections(width, height);
    updateAllCellStates();
}

function setupNeighbors(width, height) {
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const cell = board[y][x];

            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    if (dx === 0 && dy === 0) continue;

                    const nx = x + dx;
                    const ny = y + dy;

                    if (
                        nx >= 0 &&
                        nx < width &&
                        ny >= 0 &&
                        ny < height
                    ) {
                        cell.neighbors.push(board[ny][nx]);
                    }
                }
            }
        }
    }
}

function generateConnections(width, height) {
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const cell = board[y][x];

            const candidates = cell.neighbors.filter(
                neighbor => canCreateConnection(cell, neighbor)
            );

            if (candidates.length === 0) continue;

            shuffle(candidates);

            const count = randomInt(1, candidates.length);

            for (let i = 0; i < count; i++) {
                const target = candidates[i];

                if (canCreateConnection(cell, target)) {
                    addConnection(cell, target);
                }
            }
        }
    }
}

function canCreateConnection(a, b) {
    return (
        a.neighbors.includes(b) &&
        !a.connections.includes(b) &&
        !isConnectionCrossing(a, b)
    );
}

function addConnection(a, b) {
    if (a.connections.includes(b)) return;

    a.connections.push(b);
    b.connections.push(a);
}

function isConnectionCrossing(a, b) {
    for (const row of board) {
        for (const cell of row) {
            for (const other of cell.connections) {
                if (
                    cell === a ||
                    cell === b ||
                    other === a ||
                    other === b
                ) {
                    continue;
                }

                if (segmentsCross(a, b, cell, other)) {
                    return true;
                }
            }
        }
    }

    return false;
}

function segmentsCross(a, b, c, d) {
    const ab1 = cross(a, b, c);
    const ab2 = cross(a, b, d);
    const cd1 = cross(c, d, a);
    const cd2 = cross(c, d, b);

    return ab1 * ab2 < 0 && cd1 * cd2 < 0;
}

function cross(a, b, c) {
    return (
        (b.x - a.x) * (c.y - a.y) -
        (b.y - a.y) * (c.x - a.x)
    );
}

function onCellClicked(cell) {
    if (selectedCell === null) {
        selectCell(cell);
        return;
    }

    if (selectedCell === cell) {
        deselectCell();
        return;
    }

    tryConnect(selectedCell, cell);
    deselectCell();
}

function selectCell(cell) {
    if (selectedCell !== null) {
        deselectCell();
    }

    selectedCell = cell;
    getButton(cell).classList.add("selected");

    for (const neighbor of cell.neighbors) {
        getButton(neighbor).classList.add("neighbor");
    }
}

function deselectCell() {
    if (selectedCell !== null) {
        getButton(selectedCell).classList.remove("selected");

        for (const neighbor of selectedCell.neighbors) {
            getButton(neighbor).classList.remove("neighbor");
        }
    }

    selectedCell = null;
}

function tryConnect(a, b) {
    if (!a.neighbors.includes(b)) return;

    if (a.playerConnections.includes(b)) {
        removePlayerConnection(a, b);
        removeLine(a, b);
    } else {
        removeCrossingPlayerConnections(a, b);

        a.playerConnections.push(b);
        b.playerConnections.push(a);
        drawLine(a, b);
    }

    updateCellState(a);
    updateCellState(b);
    checkClear();
}

function removePlayerConnection(a, b) {
    a.playerConnections = a.playerConnections.filter(
        cell => cell !== b
    );

    b.playerConnections = b.playerConnections.filter(
        cell => cell !== a
    );
}

function removeCrossingPlayerConnections(a, b) {
    const connectionsToRemove = [];

    for (const row of board) {
        for (const cell of row) {
            for (const other of cell.playerConnections) {
                if (
                    cell === a ||
                    cell === b ||
                    other === a ||
                    other === b
                ) {
                    continue;
                }

                if (segmentsCross(a, b, cell, other)) {
                    connectionsToRemove.push([cell, other]);
                }
            }
        }
    }

    for (const [cell, other] of connectionsToRemove) {
        removePlayerConnection(cell, other);
        removeLine(cell, other);
        updateCellState(cell);
        updateCellState(other);
    }
}

function getButton(cell) {
    return boardElement
        .querySelectorAll(".board-row")[cell.y]
        .querySelectorAll(".board-button")[cell.x];
}

function getButtonCenter(button) {
    const buttonRect = button.getBoundingClientRect();
    const boardRect = boardElement.getBoundingClientRect();

    return {
        x: buttonRect.left - boardRect.left + buttonRect.width / 2,
        y: buttonRect.top - boardRect.top + buttonRect.height / 2
    };
}

function getConnectionKey(a, b) {
    const idA = `${a.x},${a.y}`;
    const idB = `${b.x},${b.y}`;

    return idA < idB
        ? `${idA}-${idB}`
        : `${idB}-${idA}`;
}

function drawLine(a, b) {
    const svg = boardElement.querySelector(".connection-layer");
    const posA = getButtonCenter(getButton(a));
    const posB = getButtonCenter(getButton(b));

    const line = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "line"
    );

    line.setAttribute("x1", posA.x);
    line.setAttribute("y1", posA.y);
    line.setAttribute("x2", posB.x);
    line.setAttribute("y2", posB.y);
    line.classList.add("connection-line");

    const key = getConnectionKey(a, b);

    lineMap.set(key, line);
    svg.appendChild(line);
}

function removeLine(a, b) {
    const key = getConnectionKey(a, b);
    const line = lineMap.get(key);

    if (!line) return;

    line.remove();
    lineMap.delete(key);
}

function updateCellState(cell) {
    const button = getButton(cell);
    const targetCount = cell.connections.length;
    const playerCount = cell.playerConnections.length;

    if (targetCount === playerCount) {
        completeCells.add(cell);
        button.classList.add("complete");
    } else {
        completeCells.delete(cell);
        button.classList.remove("complete");
    }
}

function updateAllCellStates() {
    for (const row of board) {
        for (const cell of row) {
            const button = getButton(cell);
            button.textContent = cell.connections.length;
            updateCellState(cell);
        }
    }
}

function checkClear() {
    const totalCells = boardWidth * boardHeight;
    const appMask = document.querySelector(".app-mask");
    const popupContainer = document.querySelector(".clear-popup-container");

    if (completeCells.size === totalCells) {
        appMask.classList.add("show");
        popupContainer.classList.add("show");
    } else {
        appMask.classList.remove("show");
        popupContainer.classList.remove("show");
    }
}

function redrawLines() {
    const svg = boardElement.querySelector(".connection-layer");

    svg.innerHTML = "";
    lineMap.clear();

    for (const row of board) {
        for (const cell of row) {
            for (const other of cell.playerConnections) {
                if (
                    cell.y > other.y ||
                    (cell.y === other.y && cell.x > other.x)
                ) {
                    continue;
                }

                drawLine(cell, other);
            }
        }
    }
}

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }

    return array;
}

window.addEventListener("resize", redrawLines);

createBoard(boardWidth, boardHeight);
