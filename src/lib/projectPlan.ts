import type { Plan } from '../types/plan'
import { monthlyProduction, project, type Projection } from './finance'
import { irradianceMatches } from './solar'

/** Projects a plan using its cached historical irradiance; null until a location and solar data exist. */
export function projectPlan(plan: Plan): Projection | null {
  const { lat, lon } = plan.location
  const c = plan.irradiance
  if (lat === null || lon === null || !irradianceMatches(c, lat, lon, plan.system.tiltDeg, plan.system.azimuthDeg)) {
    return null
  }
  return project(plan, monthlyProduction(c!.monthlyKwhPerM2, plan.system.sizeKw, plan.system.lossesPct))
}
