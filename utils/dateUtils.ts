/**
 * Gets the start date (Sunday) of the current week based on KST (Korea Standard Time).
 * Returns YYYYMMDD format required by the API.
 */
export const getRecentSundays = (count: number): string[] => {
    const dates: string[] = [];
    
    // Get current time in KST
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const kstOffset = 9 * 60 * 60 * 1000;
    const kstDate = new Date(utc + kstOffset);
    
    // Adjust to the most recent Sunday based on KST
    const dayOfWeek = kstDate.getDay(); // 0 is Sunday
    const lastSunday = new Date(kstDate);
    lastSunday.setDate(kstDate.getDate() - dayOfWeek);

    for (let i = 0; i < count; i++) {
        const d = new Date(lastSunday);
        d.setDate(lastSunday.getDate() - (i * 7));
        
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        
        dates.push(`${year}${month}${day}`);
    }
    
    return dates;
};

/**
 * Checks if it is currently past Friday 17:00 KST.
 * If so, returns the YYYYMMDD string for the *upcoming* Sunday (next week's start).
 * Otherwise returns null.
 */
export const getNextWeekSundayIfApplicable = (): string | null => {
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const kstOffset = 9 * 60 * 60 * 1000;
    const kstDate = new Date(utc + kstOffset);

    const dayOfWeek = kstDate.getDay(); // 0=Sun, 1=Mon, ..., 5=Fri, 6=Sat
    const hour = kstDate.getHours();

    // Check if it's Friday >= 17:00 OR Saturday (any time)
    // Note: If today is Sunday, Monday... Thursday, we don't check for *next* week yet.
    const isFriAfter17 = dayOfWeek === 5 && hour >= 17;
    const isSat = dayOfWeek === 6;

    if (isFriAfter17 || isSat) {
        // Calculate upcoming Sunday
        const daysUntilSunday = (7 - dayOfWeek) % 7; // If Sat(6) -> 1 day. If Fri(5) -> 2 days.
        const nextSunday = new Date(kstDate);
        // Explicitly set next Sunday
        nextSunday.setDate(kstDate.getDate() + (daysUntilSunday === 0 ? 7 : daysUntilSunday)); 
        // logic: if we are here, it's Fri or Sat. 
        // Fri(5) + 2 = Sun(0). Sat(6) + 1 = Sun(0).
        // However, getDay() returns 0 for Sun. 
        // If Fri: 5. We want next Sun. Add 2 days.
        // If Sat: 6. We want next Sun. Add 1 day.
        const addDays = 7 - dayOfWeek; 
        nextSunday.setDate(kstDate.getDate() + addDays);

        const year = nextSunday.getFullYear();
        const month = String(nextSunday.getMonth() + 1).padStart(2, '0');
        const day = String(nextSunday.getDate()).padStart(2, '0');

        return `${year}${month}${day}`;
    }

    return null;
};

export const formatDateForDisplay = (yyyyMMdd: string): string => {
    if (yyyyMMdd.length !== 8) return yyyyMMdd;
    return `${yyyyMMdd.substring(0, 4)}-${yyyyMMdd.substring(4, 6)}-${yyyyMMdd.substring(6, 8)}`;
};