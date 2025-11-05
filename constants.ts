
import type { QuizTopic } from './types';

export const QUIZ_TOPICS: QuizTopic[] = [
  { id: 'general_knowledge', name: 'General Knowledge', description: 'Covers a wide range of topics for all commercial drivers.', questionCount: 50 },
  { id: 'air_brakes', name: 'Air Brakes', description: 'Required for vehicles equipped with air brakes.', questionCount: 25 },
  { id: 'combination', name: 'Combination', description: 'For drivers of tractor-trailers and other combination vehicles.', questionCount: 20 },
  { id: 'passenger', name: 'Passenger', description: 'For drivers who want to operate buses.', questionCount: 20 },
  { id: 'school_bus', name: 'School Bus', description: 'For drivers who will be transporting students.', questionCount: 20 }, 
  { id: 'double_triple_trailers', name: 'Doubles/Triples', description: 'For pulling double or triple trailers.', questionCount: 20 },
  { id: 'tanker', name: 'Tanker', description: 'For operating vehicles used to transport liquids or gases.', questionCount: 20 },
  { id: 'hazardous_materials', name: 'Hazardous Materials', description: 'For drivers who will transport hazardous materials.', questionCount: 30 },
];
