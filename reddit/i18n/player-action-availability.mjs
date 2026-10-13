// Closed copies of public messages. IDs belong to presentation, never to a save or command.
// Exact ES matches certify the wording; no substring matching or inferred eligibility.
export const playerActionAvailability = {
 career_closed: ['La carrera ya ha terminado.', 'Your career has ended.'],
 pending_situation: ['Resuelve la situación pendiente antes de realizar una acción.', 'Resolve the pending situation before taking an action.'],
 automatic_simulation: ['Finaliza el bloque de simulación automática antes de realizar una acción.', 'Finish the automatic simulation period before taking an action.'],
 career_state: ['Esta acción no está disponible en el estado actual de la carrera.', 'This action is unavailable at this point in your career.'],
 current_club: ['Necesitas tener un club actual para realizar esta acción.', 'You need a current club to take this action.'],
 career_stage: ['Esta acción no está disponible en esta etapa de tu carrera.', 'This action is unavailable at this stage of your career.'],
 contract_phase: ['Esta acción no está disponible en esta fase del contrato.', 'This action is unavailable at this point in your contract.'],
 physical_condition: ['Tu estado físico actual no permite esta acción.', 'Your current physical condition does not allow this action.'],
 no_target: ['No hay un objetivo válido disponible para esta acción.', 'No valid person is available for this action.'],
 market_situation: ['Esta acción no está disponible con tu situación de mercado actual.', 'This action is unavailable in your current transfer situation.'],
 unexpected_target: ['Esta acción no admite objetivo.', 'This action does not accept a person as a target.'],
 required_target: ['Debes elegir un objetivo válido.', 'Choose a valid person.'],
 invalid_target: ['El objetivo ya no está disponible para esta acción.', 'This person is no longer available for this action.']
};
// Only public registry roles for executable action targets. No profiles, relationships or agendas.
export const playerActionTargetRoles = {
 NPC_CCH_01: ['Entrenador', 'Coach'],
 NPC_CCH_02: ['Segundo entrenador', 'Assistant coach'],
 NPC_AGT_01: ['Agente local', 'Local agent'],
 NPC_AGT_02: ['Agente, Prisma Sports', 'Agent, Prisma Sports'],
 NPC_PLR_10: ['Central y capitán', 'Centre-back and captain'],
 NPC_PLR_11: ['Portero y vicecapitán', 'Goalkeeper and vice-captain'],
 NPC_PLR_12: ['Extremo derecho titular', 'Starting right winger'],
 NPC_PLR_13: ['Centrocampista', 'Midfielder'],
 NPC_PLR_14: ['Delantero canterano', 'Academy striker'],
 NPC_PLR_15: ['Mediapunta/extremo canterano', 'Academy attacking midfielder/winger']
};
export const playerActionAvailabilityCopy = {
 detailsPending: 'Availability details are available in Español.',
 rolePending: 'Role details are available in Español.',
 cooldown: date => `Available again on ${date}.`
};
