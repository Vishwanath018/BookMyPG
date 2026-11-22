"use client";

type Props = {
  city: string;
};

const common = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2.2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export default function CityLandmarkIcon({ city }: Props) {
  const icons: Record<string, React.ReactNode> = {
    Mumbai: (
      <g {...common}>
        <path d="M10 82V38L20 30V20H80V30L90 38V82Z"/>
        <path d="M5 82H95M20 82V48H80V82"/>
        <path d="M35 82V62Q50 42 65 62V82"/>
        <path d="M42 82V64Q50 54 58 64V82"/>
        <path d="M15 38H85M25 30V12H75V30"/>
        <path d="M35 12V5M50 12V2M65 12V5"/>
        <path d="M15 48H85M15 60H35M65 60H85"/>
        <path d="M25 48V56M75 48V56M25 68V82M75 68V82"/>
        <path d="M35 20V30M65 20V30M45 20V30M55 20V30"/>
      </g>
    ),
    "Delhi-NCR": (
      <g {...common}>
        <path d="M15 85H85M20 80H80L75 70H25Z"/>
        <path d="M25 70L30 62H70L75 70"/>
        <path d="M30 62L35 38Q50 15 65 38L70 62"/>
        <path d="M35 38Q50 25 65 38"/>
        <path d="M35 38V80M65 38V80M45 42V80M55 42V80"/>
        <path d="M20 50H80M25 60H75"/>
        <path d="M42 80V65Q50 53 58 65V80"/>
        <path d="M30 30H70M35 25H65"/>
        <path d="M15 85V90M85 85V90"/>
      </g>
    ),
    Bengaluru: (
      <g strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 82V48H18V55H28V42H38V30H45V20H55V30H62V42H72V55H82V48H92V82Z"
          fill="#19c8bd" stroke="#34494a" strokeWidth="2.2"/>
        <path d="M40 82V47Q50 34 60 47V82" fill="none" stroke="#34494a" strokeWidth="2"/>
        <path d="M45 48H55M45 58H55M45 68H55" stroke="#34494a" strokeWidth="2"/>
        <path d="M48 20V12H52V20M46 12H54" fill="none" stroke="#34494a" strokeWidth="2"/>
        <path d="M18 55V82M28 55V82M72 55V82M82 55V82" fill="none" stroke="#34494a" strokeWidth="2"/>
        <path d="M13 64H22M33 64H39M61 64H67M78 64H87" stroke="#34494a" strokeWidth="2"/>
        <path d="M5 82H95" stroke="#34494a" strokeWidth="2.2"/>
      </g>
    ),
    Hyderabad: (
      <g {...common}>
        <path d="M15 85H85M20 80V48H80V80"/>
        <path d="M25 48V28L32 18L39 28V48"/>
        <path d="M61 48V28L68 18L75 28V48"/>
        <path d="M25 28H39M61 28H75"/>
        <path d="M39 85V58Q50 42 61 58V85"/>
        <path d="M45 85V60Q50 52 55 60V85"/>
        <path d="M45 18V8H50V18M65 18V8H70V18"/>
        <path d="M15 48H85M30 48V85M70 48V85"/>
        <path d="M8 85V42H15M85 42H92V85"/>
      </g>
    ),
    Chandigarh: (
      <g {...common}>
        <path d="M50 8V52"/>
        <path d="M50 15Q30 5 24 22Q38 30 50 22"/>
        <path d="M50 22Q70 8 78 22Q65 32 50 30"/>
        <path d="M50 30Q35 35 30 48Q45 45 50 30"/>
        <path d="M50 52V82M30 82H70M25 88H75"/>
        <path d="M20 82V65H80V82M30 65V60H70V65"/>
        <path d="M50 52L44 60H56Z"/>
      </g>
    ),
    Ahmedabad: (
      <g {...common}>
        <path d="M10 85H90"/>
        <path d="M18 85V50L25 42V30L32 42V50H40V85"/>
        <path d="M60 85V50L68 42V30L75 42V50H82V85"/>
        <path d="M25 30V20H32V30M68 30V20H75V30"/>
        <path d="M40 85V60Q50 43 60 60V85"/>
        <path d="M45 85V60Q50 53 55 60V85"/>
        <path d="M10 50H90M15 60H85"/>
        <path d="M25 58V70M32 58V70M68 58V70M75 58V70"/>
        <path d="M20 20H38M62 20H80"/>
      </g>
    ),
    Pune: (
      <g {...common}>
        <path d="M8 85H92M15 80V40H85V80"/>
        <path d="M10 40L50 18L90 40Z"/>
        <path d="M22 40V30H78V40"/>
        <path d="M25 50H75M25 60H75M25 70H75"/>
        <path d="M42 80V52Q50 43 58 52V80"/>
        <path d="M18 40V80M82 40V80"/>
        <path d="M45 18V10H55V18M48 10V5H52V10"/>
        <path d="M32 30V22M68 30V22"/>
      </g>
    ),
    Chennai: (
      <g {...common}>
        <path d="M10 85H90"/>
        <path d="M20 85V35H80V85"/>
        <path d="M25 35L30 25L35 35L40 25L45 35L50 25L55 35L60 25L65 35L70 25L75 35"/>
        <path d="M30 25L35 12H65L70 25"/>
        <path d="M40 12L45 5H55L60 12"/>
        <path d="M43 85V60Q50 48 57 60V85"/>
        <path d="M25 45H75M25 55H75M25 65H38M62 65H75"/>
        <path d="M15 85V42H20M80 42H85V85"/>
      </g>
    ),
    Kolkata: (
      <g {...common}>
        <path d="M8 85H92"/>
        <path d="M20 85V55H80V85"/>
        <path d="M30 55V35Q50 20 70 35V55"/>
        <path d="M35 35V25H65V35"/>
        <path d="M42 25V17H58V25"/>
        <path d="M47 17V8H53V17"/>
        <path d="M43 85V65Q50 55 57 65V85"/>
        <path d="M30 45H70M25 55H75"/>
        <path d="M25 65V80M75 65V80M15 85V55M85 85V55"/>
      </g>
    ),
    Kochi: (
      <g {...common}>
        <path d="M8 85H92"/>
        <path d="M15 85L20 50L25 85M20 50L10 30M20 50L30 30"/>
        <path d="M40 85L45 50L50 85M45 50L35 30M45 50L55 30"/>
        <path d="M65 85L70 50L75 85M70 50L60 30M70 50L80 30"/>
        <path d="M10 30L30 30M35 30L55 30M60 30L80 30"/>
        <path d="M10 30L30 42M35 30L55 42M60 30L80 42"/>
        <path d="M10 42H30M35 42H55M60 42H80"/>
        <path d="M20 85V70M45 85V70M70 85V70"/>
      </g>
    ),
  };

  return (
    <svg
      viewBox="0 0 100 100"
      width="85"
      height="78"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={`${city} landmark illustration`}
    >
      {icons[city] || icons.Mumbai}
    </svg>
  );
}
