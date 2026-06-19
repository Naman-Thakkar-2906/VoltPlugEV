const socketIO = require('socket.io');

let io;

const init = (server) => {
    io = socketIO(server, {
        cors: {
            origin: "*", // In production, specify the frontend URL
            methods: ["GET", "POST", "PUT"]
        }
    });

    io.on('connection', (socket) => {

        socket.on('join', (userId) => {
            socket.join(`user_${userId}`);
        });

        socket.on('joinStationMaster', (ownerId) => {
            socket.join(`stationMaster_${ownerId}`);
        });

        socket.on('joinAdmin', (user) => {
            if (user && user.role === 'admin') {
                socket.join('admin_room');
            } else {
                console.warn('[Security] Unauthorized attempt to join admin socket room:', socket.id);
            }
        });

        socket.on('disconnect', () => {
        });
    });

    return io;
};

const getIO = () => {
    if (!io) {
        throw new Error('Socket.io not initialized!');
    }
    return io;
};

module.exports = { init, getIO };
