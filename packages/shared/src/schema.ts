import { Schema, MapSchema, defineTypes } from '@colyseus/schema';
export class PlayerState extends Schema {
  x = 0;
  y = 0.91;
  z = 0;
  yaw = 0;
  moving = false;
  running = false;
  ack = 0;
  name = 'Viandante';
}
defineTypes(PlayerState, {
  x: 'float32',
  y: 'float32',
  z: 'float32',
  yaw: 'float32',
  moving: 'boolean',
  running: 'boolean',
  ack: 'uint32',
  name: 'string',
});
export class WorldState extends Schema {
  players = new MapSchema<PlayerState>();
  dummyHp = 240;
  respawnAt = 0;
}
defineTypes(WorldState, { players: { map: PlayerState }, dummyHp: 'uint16', respawnAt: 'float64' });
