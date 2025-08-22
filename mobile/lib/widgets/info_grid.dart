import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';

class InfoGrid extends StatelessWidget {
  final List<dynamic> info;
  final Color Function(String title, String subtitle)? getSubtitleColor;

  const InfoGrid({
    super.key,
    required this.info,
    this.getSubtitleColor,
  });

  Color _defaultColorFunction(String title, String subtitle) {
    return Colors.black;
  }

  @override
  Widget build(BuildContext context) {
    if (info.isEmpty) {
      return const SizedBox.shrink();
    }

    const int crossAxisCount = 3;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          "Details",
          style: Theme.of(context).textTheme.titleMedium
              ?.copyWith(fontWeight: FontWeight.bold),
        ),
        SizedBox(height: 12.h),
        GridView.count(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          crossAxisCount: crossAxisCount,
          childAspectRatio: 2.5 / 1,
          crossAxisSpacing: 6.w,
          mainAxisSpacing: 6.h,
          children: List.generate(info.length, (i) {
            final Map<String, dynamic> item = info[i];
            final title = item["title"] ?? "";
            final subtitle = item["subtitle"] ?? "";
            final bool isRightAligned = (i + 1) % crossAxisCount == 0;

            final colorFunction = getSubtitleColor ?? _defaultColorFunction;
            final subtitleColor = colorFunction(title, subtitle);

            return Align(
              alignment: isRightAligned ? Alignment.centerRight : Alignment.centerLeft,
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: isRightAligned ? CrossAxisAlignment.end : CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: Colors.grey,
                          fontWeight: FontWeight.w500,
                        ),
                  ),
                  SizedBox(height: 2.h),
                  Text(
                    subtitle,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: subtitleColor,
                        ),
                  ),
                ],
              ),
            );
          }),
        ),
      ],
    );
  }
}