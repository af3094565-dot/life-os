import { ArrowRight, Check, Compass, Crown, Repeat2, Target } from 'lucide-react'

type Props = { feature: 'goals' | 'quests' | 'life-map'; onBuy: () => void }
const COPY = {
  goals: { title: 'Привычки становятся путём к цели', text: 'Выбери результат, прикрепи привычки и смотри, как ежедневные действия продвигают тебя вперёд.', example: ['Цель: прочитать 12 книг', 'Привычка: читать 20 минут', 'Отметка сегодня → прогресс цели'] },
  quests: { title: 'Добавь вызов своему привычному ритму', text: 'Возьми квест на срок. Выполняй связанную привычку, следи за условиями и получай награду за завершение.', example: ['Квест: 7 дней чтения', 'Ежедневный шаг в «Сегодня»', 'Условия выполнены → награда'] },
  'life-map': { title: 'Увидь, чему хочется уделить внимание', text: 'Собери восемь сфер жизни в одной картине. Добавляй привычки в выбранные сферы и наблюдай за изменениями.', example: ['Сфера: здоровье', 'Привычка: ежедневная прогулка', 'Отметки → прогресс сферы'] },
} as const
export function SubscriptionPaywall({ feature, onBuy }: Props) {
  const copy = COPY[feature]
  return <section className="pro-explainer">
    <div className="pro-explainer-intro"><span className="pro-badge"><Crown size={15} /> LIFE OS PRO</span><h2>{copy.title}</h2><p>{copy.text}</p></div>
    <div className="pro-example"><span className="workspace-overline">ПРИМЕР СВЯЗИ РАЗДЕЛОВ</span><div>{copy.example.map((item, i) => <span key={item}><b>{i + 1}</b>{item}{i < 2 && <ArrowRight size={16} />}</span>)}</div></div>
    <div className="pro-benefits">{[
      { icon: Target, title: 'Цели', text: 'Объедини привычки вокруг результата.' },
      { icon: Compass, title: 'Карта жизни', text: 'Выбери направление для следующего шага.' },
      { icon: Repeat2, title: 'Квесты', text: 'Поддержи регулярность испытанием на срок.' },
    ].map(item => <div key={item.title}><item.icon size={21} /><h3>{item.title}</h3><p>{item.text}</p></div>)}</div>
    <div className="pro-explainer-footer"><div><strong>Одна система вместо отдельных списков</strong><p><Check size={14} /> Привычки, задачи и календарь остаются в базовом плане.</p><small>Сейчас действует тестовый доступ: 0 ₽, без оплаты.</small></div><button type="button" onClick={onBuy}>Попробовать Pro бесплатно <ArrowRight size={17} /></button></div>
  </section>
}
