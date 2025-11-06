export function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

export function debounce(func: (...args: any[]) => any, delay: number) {
    let timeoutId: NodeJS.Timeout | null = null
    return (...args: any[]) => {
        if (timeoutId) clearTimeout(timeoutId)
        //  重新设置一个
        timeoutId = setTimeout(() => {
            func(...args)
        }, delay)
    }
}