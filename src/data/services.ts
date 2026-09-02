import cameramanImg from '../assets/our-services/Cameraman.avif';
import dronemanImg from '../assets/our-services/Droneman.avif';
import programmerImg from '../assets/our-services/Programmer.avif';

export const servicesData = [
  { id: 'capture', text: 'Capture', img: cameramanImg },
  { id: 'drone', text: 'Drone', img: dronemanImg },
  { id: 'code', text: 'Code', img: programmerImg },
] as const;

export type Service = (typeof servicesData)[number];
