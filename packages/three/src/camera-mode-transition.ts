export type PrototypeCameraMotionProfile = "responsive" | "spring";

const PROFILE_DURATION_MS: Readonly<
  Record<PrototypeCameraMotionProfile, number>
> = {
  responsive: 440,
  spring: 650,
};

const SPRING_DAMPING_RATIO = 0.73;
const SPRING_NATURAL_FREQUENCY = 8.35;

export interface CameraModeTransition {
  readonly duration: number;
  readonly from: number;
  readonly initialVelocity: number;
  readonly profile: PrototypeCameraMotionProfile;
  readonly startedAt: number;
  readonly to: number;
  readonly velocityPreserving: boolean;
}

export interface CameraModeTransitionSample {
  readonly complete: boolean;
  readonly progress: number;
  readonly velocity: number;
}

interface BeginCameraModeTransitionOptions {
  readonly from: number;
  readonly now: number;
  readonly profile: PrototypeCameraMotionProfile;
  readonly to: number;
  readonly velocity: number;
}

export function cameraMotionProfileDuration(
  profile: PrototypeCameraMotionProfile,
): number {
  return PROFILE_DURATION_MS[profile];
}

function sampleRawSpring(progress: number): number {
  const dampedFrequency =
    SPRING_NATURAL_FREQUENCY * Math.sqrt(1 - SPRING_DAMPING_RATIO ** 2);
  const envelope = Math.exp(
    -SPRING_DAMPING_RATIO * SPRING_NATURAL_FREQUENCY * progress,
  );
  const oscillation =
    Math.cos(dampedFrequency * progress) +
    (SPRING_DAMPING_RATIO / Math.sqrt(1 - SPRING_DAMPING_RATIO ** 2)) *
      Math.sin(dampedFrequency * progress);

  return 1 - envelope * oscillation;
}

function sampleRawSpringDerivative(progress: number): number {
  const dampedFrequency =
    SPRING_NATURAL_FREQUENCY * Math.sqrt(1 - SPRING_DAMPING_RATIO ** 2);
  const envelope = Math.exp(
    -SPRING_DAMPING_RATIO * SPRING_NATURAL_FREQUENCY * progress,
  );

  return (
    envelope *
    (SPRING_NATURAL_FREQUENCY ** 2 / dampedFrequency) *
    Math.sin(dampedFrequency * progress)
  );
}

function sampleSpringCorrection(progress: number): number {
  const squared = progress ** 2;
  const cubed = progress ** 3;
  const endpointOffset = 1 - sampleRawSpring(1);
  const endpointTangent = -sampleRawSpringDerivative(1);

  return (
    (-2 * cubed + 3 * squared) * endpointOffset +
    (cubed - squared) * endpointTangent
  );
}

function sampleSpringCorrectionDerivative(progress: number): number {
  const squared = progress ** 2;
  const endpointOffset = 1 - sampleRawSpring(1);
  const endpointTangent = -sampleRawSpringDerivative(1);

  return (
    (-6 * squared + 6 * progress) * endpointOffset +
    (3 * squared - 2 * progress) * endpointTangent
  );
}

function sampleSpring(progress: number): number {
  return sampleRawSpring(progress) + sampleSpringCorrection(progress);
}

export function sampleCameraMotionProfile(
  profile: PrototypeCameraMotionProfile,
  progress: number,
): number {
  if (progress <= 0) {
    return 0;
  }

  if (progress >= 1) {
    return 1;
  }

  if (profile === "spring") {
    return sampleSpring(progress);
  }

  return 1 - (1 - progress) ** 4;
}

function sampleCameraMotionProfileDerivative(
  profile: PrototypeCameraMotionProfile,
  progress: number,
): number {
  if (progress <= 0 || progress >= 1) {
    return 0;
  }

  if (profile === "spring") {
    return (
      sampleRawSpringDerivative(progress) +
      sampleSpringCorrectionDerivative(progress)
    );
  }

  return 4 * (1 - progress) ** 3;
}

export function beginCameraModeTransition(
  options: BeginCameraModeTransitionOptions,
): CameraModeTransition {
  const distance = Math.abs(options.to - options.from);
  const duration =
    distance === 0
      ? 0
      : cameraMotionProfileDuration(options.profile) * distance;

  return {
    duration,
    from: options.from,
    initialVelocity: options.velocity,
    profile: options.profile,
    startedAt: options.now,
    to: options.to,
    velocityPreserving: Math.abs(options.velocity) > Number.EPSILON,
  };
}

function sampleVelocityPreservingTransition(
  transition: CameraModeTransition,
  timeProgress: number,
): CameraModeTransitionSample {
  const squared = timeProgress ** 2;
  const cubed = timeProgress ** 3;
  const startTangent = transition.initialVelocity * transition.duration;
  const progress =
    (2 * cubed - 3 * squared + 1) * transition.from +
    (cubed - 2 * squared + timeProgress) * startTangent +
    (-2 * cubed + 3 * squared) * transition.to;
  const derivative =
    (6 * squared - 6 * timeProgress) * transition.from +
    (3 * squared - 4 * timeProgress + 1) * startTangent +
    (-6 * squared + 6 * timeProgress) * transition.to;

  return {
    complete: false,
    progress,
    velocity: derivative / transition.duration,
  };
}

export function sampleCameraModeTransition(
  transition: CameraModeTransition,
  now: number,
): CameraModeTransitionSample {
  if (
    transition.duration === 0 ||
    now >= transition.startedAt + transition.duration
  ) {
    return {
      complete: true,
      progress: transition.to,
      velocity: 0,
    };
  }

  const timeProgress = Math.max(
    0,
    (now - transition.startedAt) / transition.duration,
  );

  if (transition.velocityPreserving) {
    return sampleVelocityPreservingTransition(transition, timeProgress);
  }

  const eased = sampleCameraMotionProfile(transition.profile, timeProgress);
  const distance = transition.to - transition.from;

  return {
    complete: false,
    progress: transition.from + distance * eased,
    velocity:
      (distance *
        sampleCameraMotionProfileDerivative(transition.profile, timeProgress)) /
      transition.duration,
  };
}
