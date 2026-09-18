import type { PageId } from './seed'
import type { TrainingPhase } from '../lib/auth'

export type { TrainingPhase }

/**
 * go — кнопка ведёт на page и дальше
 * click — кликает по подсвеченному элементу (открывает форму) и дальше
 * next — просто следующий шаг
 * done — завершить тур
 */
export type TourAction = 'go' | 'click' | 'next' | 'done'

export type TourStep = {
  id: string
  page: PageId
  /** data-tour атрибут; `center` — без подсветки */
  target: string
  title: string
  body: string
  /** Текст кнопки в боковой панели */
  cta: string
  action: TourAction
}

/** Бесплатные разделы — подсветка + действие */
export const FREE_TOUR_STEPS: TourStep[] = [
  { id: 'welcome', page: 'dashboard', target: 'center', title: 'Твоя система в четырёх разделах', body: 'Сегодня — делай следующий шаг. Мой план — выбирай действия. Мои цели — определяй направление. Результаты — замечай изменения.', cta: 'Показать мой план', action: 'next' },
  { id: 'plan', page: 'dashboard', target: 'section-plan', title: 'Начни с одной привычки', body: 'В «Моём плане» собраны привычки, задачи и календарь. Не нужно настраивать всё сразу: выбери одно небольшое действие.', cta: 'Открыть мой план', action: 'go' },
  { id: 'habit', page: 'habits', target: 'habits-add', title: 'Здесь создаётся привычка', body: 'Укажи действие и удобный ритм. Привычка появится в «Сегодня», где можно отметить выполнение. Создать её можно после этой подсказки.', cta: 'Дальше', action: 'next' },
  { id: 'calendar', page: 'habits', target: 'nav-calendar', title: 'Тот же план, другой вид', body: 'Во вкладке «Задачи» планируй дела, а в «Календаре» смотри их по дням. Переносить данные между вкладками не нужно.', cta: 'Дальше', action: 'next' },
  { id: 'finish', page: 'dashboard', target: 'center', title: 'Теперь — первый шаг', body: 'Создай привычку и отметь её выполнение на главной. Когда освоишь ритм, свяжи привычки с целями в Pro. Маршрут на главной всегда подскажет, что дальше.', cta: 'Начать пользоваться', action: 'done' },
]

export const PRO_TOUR_STEPS: TourStep[] = [
  { id: 'pro-direction', page: 'life-map', target: 'center', title: 'Выбери направление', body: 'Карта жизни помогает увидеть сферы, которым хочется уделить внимание. Здесь можно добавить привычки в выбранную сферу.', cta: 'Дальше', action: 'next' },
  { id: 'pro-goals', page: 'life-map', target: 'nav-goals', title: 'Сформулируй результат', body: 'В целях опиши, чего хочешь добиться. Прикрепи существующую привычку или создай новую прямо внутри цели.', cta: 'Открыть цели', action: 'go' },
  { id: 'pro-action', page: 'goals', target: 'goals-new', title: 'Цель и ежедневные действия связаны', body: 'Отметки связанных привычек обновляют прогресс цели. Для числовой цели отдельно записывай фактический результат.', cta: 'Дальше', action: 'next' },
  { id: 'pro-quest', page: 'goals', target: 'nav-quests', title: 'Квест — дополнительная мотивация', body: 'Когда захочется испытания, выбери квест на срок. Он добавит конкретные условия и награду за их выполнение.', cta: 'Посмотреть квесты', action: 'go' },
  { id: 'pro-finish', page: 'dashboard', target: 'center', title: 'Все пути ведут в «Сегодня»', body: 'Ежедневные привычки и задачи собраны на главной. Действуй здесь, планируй в «Моём плане», а изменения смотри в «Результатах».', cta: 'К моему дню', action: 'done' },
]

export function defaultTrainingPhase(
  phase: TrainingPhase | undefined,
): TrainingPhase {
  return phase ?? 'completed'
}
