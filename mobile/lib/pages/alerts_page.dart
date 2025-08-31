import 'package:blacker/controllers/alerts_controller.dart';
import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:get/get.dart';

class AlertsPage extends StatelessWidget {
  const AlertsPage({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final controller = Get.find<AlertsController>();

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: Text(
          'Alerts',
          style: TextStyle(fontSize: 20.sp),
        ),
        backgroundColor: Colors.white,
        actions: [
          Obx(() => IconButton(
            icon: controller.isLoading.value
                ? SizedBox(
                    width: 20.w,
                    height: 20.h,
                    child: const CircularProgressIndicator(strokeWidth: 2),
                  )
                : Icon(Icons.refresh, size: 24.sp),
            onPressed: controller.isLoading.value ? null : controller.refresh,
          )),
        ],
      ),
      body: Obx(() {

        if (controller.hasError) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  Icons.error_outline,
                  size: 48.sp,
                  color: Colors.red,
                ),
                SizedBox(height: 16.h),
                Text(
                  controller.error.value!,
                  style: TextStyle(
                    color: Colors.red,
                    fontSize: 16.sp,
                  ),
                  textAlign: TextAlign.center,
                ),
                SizedBox(height: 16.h),
                ElevatedButton(
                  onPressed: controller.refresh,
                  child: Text(
                    'Retry',
                    style: TextStyle(fontSize: 14.sp),
                  ),
                ),
              ],
            ),
          );
        }


        if (controller.isEmpty) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  Icons.notifications_off,
                  size: 48.sp,
                  color: Colors.grey,
                ),
                SizedBox(height: 16.h),
                Text(
                  'No alerts available',
                  style: TextStyle(
                    color: Colors.grey,
                    fontSize: 16.sp,
                  ),
                ),
              ],
            ),
          );
        }

        return ListView.builder(
          padding: EdgeInsets.all(16.w),
          itemCount: controller.alerts.length,
          itemBuilder: (context, index) {
            final alert = controller.alerts[index];
            return Card(
              color:  Colors.white,
              margin: EdgeInsets.only(bottom: 12.h),
              child: ListTile(
                contentPadding: EdgeInsets.symmetric(
                  horizontal: 16.w,
                  vertical: 8.h,
                ),
                leading: Icon(
                  Icons.notifications,
                  size: 24.sp,
                ),
                title: Text(
                  alert['message'],
                  style: TextStyle(
                    fontSize: 16.sp,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                subtitle: Row(
                  children: [
                    Icon(
                      Icons.access_time,
                      size: 12.sp,
                      color: Colors.grey,
                    ),
                    SizedBox(width: 4.w),
                    Text(
                      alert['ago'],
                      style: TextStyle(
                        fontSize: 14.sp,
                        color: Colors.grey[600],
                      ),
                    ),
                  ],
                ),
                trailing: Icon(
                  Icons.delete,
                  size: 24.sp,
                  color: Colors.grey,
                ),
                onTap: () {
                    
                },
              ),
            );
          },
        );
      }),
    );
  }
}