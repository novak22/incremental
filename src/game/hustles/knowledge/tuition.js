import { spendMoney } from '../../currency.js';
import { recordCostContribution } from '../../metrics.js';

export function settleTuition({ track, tuition, acceptedDay, progress }) {
  if (tuition <= 0) {
    return;
  }

  spendMoney(tuition);
  recordCostContribution({
    key: `study:${track.id}:tuition`,
    label: `🎓 ${track.name} tuition`,
    amount: tuition,
    category: 'investment'
  });

  progress.tuitionPaid = (Number(progress.tuitionPaid) || 0) + tuition;
  progress.tuitionPaidOnDay = acceptedDay;
}
