import { EventEmitter } from 'events';

class AppEvents extends EventEmitter { }

export const events = new AppEvents();
