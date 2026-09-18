export type Sphere = 'base' | 'state' | 'life' | 'growth'
export type Importance = 'foundation' | 'important' | 'personal'
export type LifeFields = { sphere?: Sphere; category?: string; importance?: Importance; tags?: string[]; directionId?: string }
export type HabitDay = { value: number; target: number; at?: string; confirmed: boolean }
export type HabitTracking = LifeFields & { intent?: 'develop' | 'reduce'; quantityTarget?: number; unit?: string; records?: Record<string, HabitDay>; alternative?: string; alternativeHabitId?: string; limit?: number }
export type Indicator = { id: string; name: string; sphere: Sphere; importance: Importance; enabled: boolean; kind: 'scale' | 'number'; unit: string; target?: number; inverse?: boolean }
export type LifeEvent = LifeFields & { id: string; name: string; category: string; date: string; start?: string; end?: string; endDate?: string; kind: 'point' | 'interval'; source: 'manual' | 'habit' | 'task' | 'focus'; sourceId?: string; habitId?: string; goalId?: string; context?: string; planned?: boolean }
export type StateMark = { id: string; indicatorId: string; date: string; time?: string; value: number; target?: number; importance: Importance }
export type DailyLog = { rating?: number; confirmedHabits?: string[] }
export type DirectionVersion = LifeFields & { at: string; name: string; goalId?: string; archived?: boolean }
export type Direction = { id: string; habitIds: string[]; createdAt: string; versions: DirectionVersion[] }
export type ChoiceSetting = { enabled: boolean; time: string; dismissedDate?: string }
export type LifeData = {
  activeFocus?: {name:string;habitId?:string;endsAt:number};
  version: 1; sphereNames: Record<Sphere,string>; areaSpheres: Record<string,Sphere>; indicators: Indicator[];
  events: LifeEvent[]; marks: StateMark[]; days: Record<string,DailyLog>;
  archivedHabits: import('../../data/seed').Habit[]; directions: Direction[];
  choices: Record<string,ChoiceSetting>; choiceShownDate?: string; hiddenInsights: string[];
}
