import { formatHours, formatMoney } from '../../../core/helpers.js';

export function createTuitionLogging({ spendMoney, recordCostContribution, addLog }) {
  function payTuition({ track, tuition, progress, currentDay }) {
    if (tuition <= 0) {
      return { paid: false };
    }

    spendMoney(tuition);
    recordCostContribution({
      key: `study:${track.id}:tuition`,
      label: `🎓 ${track.name} tuition`,
      amount: tuition,
      category: 'investment'
    });

    progress.tuitionPaid = (Number(progress.tuitionPaid) || 0) + tuition;
    progress.tuitionPaidOnDay = currentDay;

    return { paid: true };
  }

  function logEnrollmentSuccess({ track, tuition }) {
    const tuitionMessage = tuition > 0
      ? `Tuition paid for $${formatMoney(tuition)}.`
      : 'No tuition due.';

    addLog(
      `You claimed a seat in ${track.name}! ${tuitionMessage} Log ${formatHours(track.hoursPerDay)} each day from the action queue to progress.`,
      'info'
    );
  }

  return {
    payTuition,
    logEnrollmentSuccess
  };
}
