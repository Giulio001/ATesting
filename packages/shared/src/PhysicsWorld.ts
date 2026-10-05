import RAPIER from '@dimforge/rapier3d-compat';
import {
  OBSTACLES,
  WORLD_LIMITS,
  PLAYER_HEIGHT,
  PLAYER_RADIUS,
  DT,
  RUN_SPEED,
  type InputFrame,
} from './index.ts';
export { RAPIER };
let initialization: Promise<void> | undefined;
export function initializePhysics() {
  return (initialization ??= RAPIER.init());
}
export interface PhysicsPlayer {
  body: RAPIER.RigidBody;
  collider: RAPIER.Collider;
}
export class PhysicsWorld {
  readonly world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
  readonly controller = this.world.createCharacterController(0.015);
  constructor() {
    this.world.timestep = DT;
    this.controller.enableSnapToGround(0.2);
    this.controller.setSlideEnabled(true);
    this.world.createCollider(
      RAPIER.ColliderDesc.cuboid(55, 0.25, 30).setTranslation(27, -0.25, 0),
    );
    for (const o of OBSTACLES)
      this.world.createCollider(
        RAPIER.ColliderDesc.cuboid(o.hx, o.height / 2, o.hz).setTranslation(o.x, o.height / 2, o.z),
      );
    for (const x of [WORLD_LIMITS.minX - 1, WORLD_LIMITS.maxX + 1])
      this.world.createCollider(RAPIER.ColliderDesc.cuboid(1, 5, 26).setTranslation(x, 5, 0));
    for (const z of [WORLD_LIMITS.minZ - 1, WORLD_LIMITS.maxZ + 1])
      this.world.createCollider(RAPIER.ColliderDesc.cuboid(53, 5, 1).setTranslation(27, 5, z));
    this.world.step();
  }
  createPlayer(x: number, z: number): PhysicsPlayer {
    const body = this.world.createRigidBody(
      RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(x, PLAYER_HEIGHT, z),
    );
    const collider = this.world.createCollider(
      RAPIER.ColliderDesc.capsule(0.55, PLAYER_RADIUS),
      body,
    );
    this.world.step();
    return { body, collider };
  }
  move(player: PhysicsPlayer, input: InputFrame) {
    const length = Math.hypot(input.x, input.z);
    const speed = length > 0.01 ? RUN_SPEED / length : 0;
    this.controller.computeColliderMovement(
      player.collider,
      { x: input.x * speed * DT, y: -0.3 * DT, z: input.z * speed * DT },
      RAPIER.QueryFilterFlags.EXCLUDE_KINEMATIC,
    );
    const m = this.controller.computedMovement(),
      p = player.body.translation();
    // This first map has a flat floor. Keep a stable capsule clearance to avoid
    // numerical penetration of the floor when making fast horizontal moves.
    player.body.setNextKinematicTranslation({
      x: p.x + m.x,
      y: Math.max(PLAYER_HEIGHT, p.y + m.y),
      z: p.z + m.z,
    });
  }
  step() {
    this.world.step();
  }
  teleport(p: PhysicsPlayer, x: number, y: number, z: number) {
    p.body.setTranslation({ x, y, z }, true);
    p.body.setNextKinematicTranslation({ x, y, z });
    this.world.step();
  }
  remove(p: PhysicsPlayer) {
    this.world.removeRigidBody(p.body);
  }
  dispose() {
    this.world.free();
  }
}
