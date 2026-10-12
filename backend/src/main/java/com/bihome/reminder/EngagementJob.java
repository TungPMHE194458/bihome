package com.bihome.reminder;

import com.bihome.survey.SurveyService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** Mỗi phút: gửi nhắc nhở đến hạn và đóng khảo sát đã hết thời gian. */
@Slf4j
@Component
@RequiredArgsConstructor
public class EngagementJob {

    private final ReminderService reminderService;
    private final SurveyService surveyService;

    @Scheduled(cron = "0 * * * * *", zone = "Asia/Ho_Chi_Minh")
    public void run() {
        int reminders = reminderService.sendDue();
        int surveys = surveyService.closeExpired();
        if (reminders > 0 || surveys > 0) {
            log.info("Đã gửi {} nhắc nhở, đóng {} khảo sát hết hạn", reminders, surveys);
        }
    }
}
