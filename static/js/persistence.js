export class PersistenceManager {
    constructor() {
        this.STORAGE_KEY = 'grape_os_usage';
        this.usageData = this.loadData();
    }

    loadData() {
        const data = localStorage.getItem(this.STORAGE_KEY);
        return data ? JSON.parse(data) : {
            counts: {
                settings: 0,
                music: 0,
                map: 0,
                mic: 0,
                'travel-reports': 0,
                compass: 0
            },
            lastSession: {
                travelQuery: '',
                lastSector: ''
            }
        };
    }

    trackAppOpen(appName) {
        if (!this.usageData.counts[appName]) this.usageData.counts[appName] = 0;
        this.usageData.counts[appName]++;
        this.saveData();
    }

    getMostUsed() {
        // Return app names sorted by usage count
        return Object.entries(this.usageData.counts)
            .sort((a, b) => b[1] - a[1])
            .map(entry => entry[0]);
    }

    isTopUsed(appName, topN = 2) {
        const sorted = this.getMostUsed();
        return sorted.indexOf(appName) < topN && sorted.indexOf(appName) !== -1;
    }

    saveData() {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.usageData));
    }
}
