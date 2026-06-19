import { io, Socket } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL || 'https://voltplugev.onrender.com/api';
const SOCKET_URL = API_URL.replace(/\/api$/, '');

class SocketService {
    private socket: Socket | null = null;

    connect() {
        if (this.socket?.connected) return;

        this.socket = io(SOCKET_URL, {
            transports: ['websocket'],
            autoConnect: true,
        });

        this.socket.on('connect', () => {
            console.log('Connected to socket server');
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from socket server');
        });
    }

    joinUserRoom(userId: string) {
        if (this.socket) {
            this.socket.emit('join', userId);
        }
    }

    joinStationMasterRoom(ownerId: string) {
        if (this.socket) {
            this.socket.emit('joinStationMaster', ownerId);
        }
    }

    joinAdminRoom(user: any) {
        if (this.socket) {
            this.socket.emit('joinAdmin', user);
        }
    }

    on(event: string, callback: (data: any) => void) {
        if (this.socket) {
            this.socket.on(event, callback);
        }
    }

    off(event: string) {
        if (this.socket) {
            this.socket.off(event);
        }
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }
}

export const socketService = new SocketService();
