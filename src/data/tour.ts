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
  {
    id: 'free-welcome',
    page: 'dashboard',
    target: 'center',
    title: 'Как пользоваться Life OS',
    body: 'Будем идти по экрану: слева подсветим элемент, справа — что это и что нажать. Сначала бесплатные разделы.',
    cta: 'Начать',
    action: 'next',
  },
  {
    id: 'free-dash-nav',
    page: 'dashboard',
    target: 'nav-dashboard',
    title: 'Сегодня',
    body: 'Главный экран дня: что сделать прямо сейчас, привычки, задачи и фокус. Сюда возвращайся каждое утро.',
    cta: 'Далее',
    action: 'next',
  },
  {
    id: 'free-desktop-nav',
    page: 'dashboard',
    target: 'nav-desktop',
    title: 'Рабочий стол',
    body: 'Это продвинутый раздел — персональная панель с виджетами. Новичку можно пропустить и вернуться позже.',
    cta: 'Перейти',
    action: 'go',
  },
  {
    id: 'free-desktop-add',
    page: 'desktop',
    target: 'desktop-add-widget',
    title: 'Добавить виджет',
    body: 'Эта кнопка открывает библиотеку виджетов. Выбери, что закрепить на сетке.',
    cta: 'Открыть виджеты',
    action: 'click',
  },
  {
    id: 'free-desktop-tip',
    page: 'desktop',
    target: 'center',
    title: 'Виджеты на столе',
    body: 'Можно закрыть окно без выбора — обучение продолжится. Потом виджеты всегда доступны здесь.',
    cta: 'Далее',
    action: 'next',
  },
  {
    id: 'free-planner-nav',
    page: 'desktop',
    target: 'nav-planner',
    title: 'Планировщик',
    body: 'Задачи по колонкам. Из задачи можно сделать привычку — она появится во вкладке «Привычки».',
    cta: 'Перейти',
    action: 'go',
  },
  {
    id: 'free-planner-add',
    page: 'planner',
    target: 'planner-add-task',
    title: 'Новая задача',
    body: 'Создай задачу на день или неделю. Потом её видно в календаре и на дашборде.',
    cta: 'Создать задачу',
    action: 'click',
  },
  {
    id: 'free-planner-tip',
    page: 'planner',
    target: 'center',
    title: 'Задачи и привычки',
    body: 'Форму можно закрыть. Важное: задача из планировщика может породить привычку — тогда прогресс считается вместе.',
    cta: 'Далее',
    action: 'next',
  },
  {
    id: 'free-calendar-nav',
    page: 'planner',
    target: 'nav-calendar',
    title: 'Календарь',
    body: 'Тот же планировщик в виде календаря — удобно смотреть нагрузку по дням.',
    cta: 'Перейти',
    action: 'go',
  },
  {
    id: 'free-calendar-tip',
    page: 'planner-calendar',
    target: 'center',
    title: 'Календарь готов',
    body: 'Здесь те же задачи, что в планировщике. Дальше — привычки: ежедневные отметки.',
    cta: 'Далее',
    action: 'next',
  },
  {
    id: 'free-habits-nav',
    page: 'planner-calendar',
    target: 'nav-habits',
    title: 'Привычки',
    body: 'Ежедневные отметки. Привычки можно связать с целями, квестами и секторами колеса баланса.',
    cta: 'Перейти',
    action: 'go',
  },
  {
    id: 'free-habits-add',
    page: 'habits',
    target: 'habits-add',
    title: 'Создать привычку',
    body: 'Нажми кнопку — откроется форма: название, срок, приоритет. После сохранения привычка появится в таблице.',
    cta: 'Создать привычку',
    action: 'click',
  },
  {
    id: 'free-habits-tip',
    page: 'habits',
    target: 'center',
    title: 'Отметки каждый день',
    body: 'Закрой форму или сохрани привычку. Каждый день отмечай выполнение — растёт стрик и начисляются алмазы.',
    cta: 'Далее',
    action: 'next',
  },
  {
    id: 'free-progress-nav',
    page: 'habits',
    target: 'nav-progress',
    title: 'Прогресс',
    body: 'Графики и статистика: где система работает, а где проседает.',
    cta: 'Перейти',
    action: 'go',
  },
  {
    id: 'free-economy',
    page: 'progress',
    target: 'header-economy',
    title: 'Алмазы и стрики',
    body: 'В шапке — баланс алмазов и серии. Алмазы тратятся на цели и привычки, зарабатываются за действия.',
    cta: 'Готово',
    action: 'done',
  },
]

/** Pro после подписки / колеса */
export const PRO_TOUR_STEPS: TourStep[] = [
  {
    id: 'pro-welcome',
    page: 'life-map',
    target: 'center',
    title: 'Pro-разделы',
    body: 'Разберём колесо баланса, цели и квесты: куда нажимать и как разделы связаны.',
    cta: 'Начать',
    action: 'next',
  },
  {
    id: 'pro-life-nav',
    page: 'life-map',
    target: 'nav-life-map',
    title: 'Карта жизни',
    body: 'Колесо баланса из 8 сфер. Оценка сектора растёт от привычек в этой сфере.',
    cta: 'Перейти',
    action: 'go',
  },
  {
    id: 'pro-life-wheel',
    page: 'life-map',
    target: 'life-wheel',
    title: 'Колесо баланса',
    body: 'Кликай по сектору — добавишь привычку в аспект. Пустые сектора — зоны роста. Центр — системная цель.',
    cta: 'Далее',
    action: 'next',
  },
  {
    id: 'pro-goals-nav',
    page: 'life-map',
    target: 'nav-goals',
    title: 'Цели',
    body: 'Здесь колесо баланса, обычные цели и матрицы 9×9. К цели крепятся привычки — они двигают прогресс.',
    cta: 'Перейти',
    action: 'go',
  },
  {
    id: 'pro-goals-new',
    page: 'goals',
    target: 'goals-new',
    title: 'Обычная цель',
    body: 'Классический способ: название, срок, описание. Стоит алмазы. Появится в списке, на дашборде и может на мудборде.',
    cta: 'Создать цель',
    action: 'click',
  },
  {
    id: 'pro-goals-new-tip',
    page: 'goals',
    target: 'center',
    title: 'После создания цели',
    body: 'К цели можно привязать привычки. Форму можно закрыть — разберём второй способ.',
    cta: 'Далее',
    action: 'next',
  },
  {
    id: 'pro-goals-matrix',
    page: 'goals',
    target: 'goals-matrix',
    title: 'Карта цели (матрица)',
    body: 'Матрица 9×9: большая цель → 8 столпов → привычки в ячейках. Привычки из матрицы бесплатные и сразу связаны с целью.',
    cta: 'Открыть матрицу',
    action: 'click',
  },
  {
    id: 'pro-goals-matrix-tip',
    page: 'goals',
    target: 'center',
    title: 'Матрица и колесо',
    body: 'Закрой матрицу. «Колесо баланса» в списке целей — системная; свои цели можно вести параллельно.',
    cta: 'Далее',
    action: 'next',
  },
  {
    id: 'pro-goals-map',
    page: 'goals',
    target: 'goals-life-map',
    title: 'Цели ↔ колесо',
    body: 'Колесо связано с картой жизни. Привычки в секторах двигают и колесо, и прогресс целей.',
    cta: 'Далее',
    action: 'next',
  },
  {
    id: 'pro-quests-nav',
    page: 'goals',
    target: 'nav-quests',
    title: 'Квесты',
    body: 'Контракты и челленджи. Квест даёт привычку/задачи и алмазы за выполнение. Можно брать из каталога или создавать свои.',
    cta: 'Перейти',
    action: 'go',
  },
  {
    id: 'pro-quests-add',
    page: 'quests',
    target: 'quests-create',
    title: 'Создать квест',
    body: 'Свой квест — свой контракт. Можно делиться с другими и получать алмазы с продаж.',
    cta: 'Создать квест',
    action: 'click',
  },
  {
    id: 'pro-links',
    page: 'quests',
    target: 'center',
    title: 'Как всё связано',
    body: 'Привычка → цель / квест / сектор колеса. Цель → дашборд и мудборд. Планировщик → может породить привычку. Меняешь одно — обновляется связанное.',
    cta: 'Завершить',
    action: 'done',
  },
]

export function defaultTrainingPhase(
  phase: TrainingPhase | undefined,
): TrainingPhase {
  return phase ?? 'completed'
}
