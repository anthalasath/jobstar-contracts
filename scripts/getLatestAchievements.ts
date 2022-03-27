import { createAchievements } from "./createAchievements";
import { deployJobStar } from "./deploy";

async function main(): Promise<void> {
    const { jobStar, mockLensHub } = await deployJobStar();
    await createAchievements(jobStar, mockLensHub);
    const filter = jobStar.filters.AchievementAccepted();
    const events = await jobStar.queryFilter(filter);
    const achievements = await Promise.all(events.map(e => jobStar.getAchievementById(e.args!.achievementId)));
    console.log(achievements);
}

main()
    .catch(console.error);