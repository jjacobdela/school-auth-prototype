export async function getModules() {
    return {
        modules: [
            { id: "1", title: "Cybersecurity Awareness" },
            { id: "2", title: "React Fundamentals" },
        ],
    };
}

export async function requestTraining() {
    return { success: true };
}
