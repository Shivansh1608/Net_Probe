import axios from 'axios';
import { io } from 'socket.io-client';

// Use environment variables or fallback to localhost during local test run
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

export const socket = io(SOCKET_URL, {
  autoConnect: true
});
