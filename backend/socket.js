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
        console.log('New client connected:', socket.id);

        socket.on('join', (userId) => {
            socket.join(`user_${userId}`);
            console.log(`User joined room: user_${userId}`);
        });

        socket.on('joinStationMaster', (ownerId) => {
            socket.join(`stationMaster_${ownerId}`);
            console.log(`Station Master joined room: stationMaster_${ownerId}`);
        });

        socket.on('joinAdmin', (user) => {
            if (user && user.role === 'admin') {
                socket.join('admin_room');
                console.log('Admin joined room: admin_room');
            } else {
                console.log('Unauthorized attempt to join admin room');
            }
        });

        socket.on('disconnect', () => {
            console.log('Client disconnected');
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
