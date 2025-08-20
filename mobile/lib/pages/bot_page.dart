import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import '../widgets/pulsating_indicator.dart';

class BotPage extends StatelessWidget {
  final Map<String, dynamic> bot;

  const BotPage({super.key, required this.bot});

  @override
  Widget build(BuildContext context) {
    final infoLength = bot["info"].length;
    final crossAxisCount = 3;

    return DefaultTabController(
      length: 3,
      child: Scaffold(
        backgroundColor: Colors.white,
        appBar: AppBar(
          title: Text(
            bot["id"] ?? "Bot",
            style: Theme.of(context).textTheme.titleMedium,
          ),
          backgroundColor: Colors.white,
          elevation: 0,
          bottom: PreferredSize(
            preferredSize: Size.fromHeight(48.h),
            child: TabBar(
              isScrollable: false,
              labelColor: Theme.of(context).primaryColor,
              unselectedLabelColor: Colors.grey,
              indicatorColor: Theme.of(context).primaryColor,
              dividerColor: Theme.of(context).dividerColor,
              labelStyle: TextStyle(fontSize: 14.sp),
              tabs: const [
                Tab(text: "Overview"),
                Tab(text: "Trades"),
                Tab(text: "Config"),
              ],
            ),
          ),
        ),
        body: TabBarView(
          children: [
            /// -------- OVERVIEW TAB --------
            SingleChildScrollView(
              padding: EdgeInsets.all(16.w),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  SizedBox(height: 12.h),

                  /// HEADER
                  Obx(
                    () => Row(
                      children: [
                        Text(
                          bot["symbol"],
                          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                fontWeight: FontWeight.bold,
                                fontSize: 16.sp,
                              ),
                        ),
                        SizedBox(width: 6.w),
                        SvgPicture.asset(
                          'assets/icons/binance.svg',
                          width: 20.w,
                          height: 20.w,
                        ),
                        const Spacer(),
                        Row(
                          children: [
                            PulsatingIndicator(
                              isActive: bot["live"]?.value ?? false,
                              size: 10.w,
                            ),
                            SizedBox(width: 6.w),
                            Text(
                              bot["live"]?.value == true ? "Live" : "Offline",
                              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                    fontSize: 12.sp,
                                  ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),

                  SizedBox(height: 12.h),

                  Text(
                    "Iteration: ${bot["iteration"]}",
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          fontSize: 12.sp,
                        ),
                  ),

                  SizedBox(height: 12.h),

                  /// GRID INFO (corregido, sin altura fija)
                  GridView.count(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    crossAxisCount: crossAxisCount,
                    childAspectRatio: 3 / 1,
                    crossAxisSpacing: 4.w,
                    mainAxisSpacing: 4.h,
                    children: List.generate(infoLength, (i) {
                      int colPosition = i % crossAxisCount;

                      Alignment alignment;
                      CrossAxisAlignment crossAlign;

                      switch (colPosition) {
                        case 0:
                        case 1:
                          alignment = Alignment.centerLeft;
                          crossAlign = CrossAxisAlignment.start;
                          break;
                        case 2:
                          alignment = Alignment.centerRight;
                          crossAlign = CrossAxisAlignment.end;
                          break;
                        default:
                          alignment = Alignment.centerLeft;
                          crossAlign = CrossAxisAlignment.start;
                      }

                      final actions = bot["info"];
                      final title = actions[i]["title"] ?? "";
                      final subtitle = actions[i]["subtitle"] ?? "";

                      return InkWell(
                        onTap: () => debugPrint("${bot["id"]} - $title presionado"),
                        child: Align(
                          alignment: alignment,
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            crossAxisAlignment: crossAlign,
                            children: [
                              Text(
                                title,
                                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                      fontSize: 11.sp,
                                      color: Colors.grey,
                                    ),
                              ),
                              SizedBox(height: 2.h),
                              Text(
                                subtitle,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                      fontSize: 12.sp,
                                      color: (title == "Status" && subtitle == "Stopped") ||
                                              subtitle == "Error"
                                          ? Colors.red
                                          : Colors.black,
                                    ),
                              ),
                            ],
                          ),
                        ),
                      );
                    }),
                  ),

                  SizedBox(height: 16.h),

                  Divider(color: Theme.of(context).dividerColor),

                  SizedBox(height: 16.h),

                  Text(
                    "Description",
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                          fontSize: 14.sp,
                        ),
                  ),

                  SizedBox(height: 8.h),

                  Text(
                    bot["description"],
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          fontSize: 12.sp,
                        ),
                  ),
                ],
              ),
            ),

            /// -------- TRADES TAB --------
            Center(
              child: Text(
                "Trades history...",
                style: TextStyle(fontSize: 14.sp),
              ),
            ),

            /// -------- CONFIG TAB --------
            Center(
              child: Text(
                "Configuration details...",
                style: TextStyle(fontSize: 14.sp),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
