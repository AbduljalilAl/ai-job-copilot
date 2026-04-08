export class AIService {
  generateTailoredSummary(_resumeText: string, jobText: string, matchedSkills: string[], missingSkills: string[]) {
    const focus = matchedSkills.slice(0, 4).join(", ") || "technical fundamentals";
    const target = this.extractTarget(jobText);

    return `Motivated candidate targeting ${target}, with hands-on exposure to ${focus}. Brings project-based learning, strong adaptability, and a practical fit for internship and summer training environments. Resume alignment can improve further by addressing ${missingSkills.slice(0, 3).join(", ") || "role-specific expectations"}.`;
  }

  generateCoverLetter(jobText: string, matchedSkills: string[]) {
    const target = this.extractTarget(jobText);
    const strengths = matchedSkills.slice(0, 5).join(", ") || "software development fundamentals";

    return `Dear Hiring Team,\n\nI am applying for the ${target} opportunity. My background aligns with your focus on ${strengths}, and I am interested in contributing as an intern or trainee while continuing to build practical experience.\n\nThrough coursework and projects, I have developed a strong foundation in problem solving, collaboration, and learning new tools quickly. I would value the chance to support your team, contribute to meaningful work, and grow through real-world mentorship.\n\nSincerely,\nYour Name`;
  }

  private extractTarget(jobText: string) {
    const firstLine = jobText.split("\n").find((line) => line.trim().length > 0);
    return firstLine?.trim().slice(0, 80) || "internship program";
  }
}

