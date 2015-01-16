from django.test import TestCase, RequestFactory
from django.contrib.auth.models import Group, Permission
from django.test.client import Client
from django.utils.timezone import utc

from datetime import datetime

from allaccess.models import Provider, AccountAccess
from accounts.models import User, ChannelPartnership
from dolos.models import Campaign, Posting, ScheduledPosting, PostingLog

from report.models import OverviewReport
from report.views import htsql

# Create your tests here.
class ReportJsonTest(TestCase):
    def setUp(self):
        self.access_token = 'CAACEdEose0cBAMVrY4blvqG0C1zFGzn2oEmCAGAnIpwzNSQp2v9PiAdhZBOEic8q7FcAfVzbBWo70nnY1Bvgr32jowEKuRVYXt7h7rrB7vK8sGs8Kxut3fNl38xeLT0wNZBPQGqag9bG8rKemhfptb3XqtvJEXDdZAcn4jZCeUNvZClf120oZAPHZAZAfriV3fK0wk6QOfkw6gx8LSPpDR1K'
        self.fb_page_id = '537081059740179'
        self.fb_post_id = '537081059740179_566797693435182'

        self.producer1 = User.objects.create_user('producer1', password='123', post_freq=1, transactional_ratio=0.5)
        self.partner = User.objects.create_user('partner', password='123', post_freq=1, transactional_ratio=0.5, autoschedule=True)
        group = Group.objects.create(name='Producer')
        group.permissions.add(
                Permission.objects.get(codename='add_channelpartnership'))
        self.producer1.groups.add(group)
        self.fbpage = Provider.objects.create(
                name='fbpage',
                request_token_url='',
                authorization_url='',
                access_token_url='',
                profile_url='',
                )
        self.twitter = Provider.objects.create(
                name='twitter',
                request_token_url='',
                authorization_url='',
                access_token_url='',
                profile_url='',
                )
        self.fb_account = AccountAccess.objects.create(
                provider=self.fbpage,
                user=self.partner,
                identifier=self.fb_page_id,
                access_token=self.access_token
                )
        AccountAccess.objects.create(
                provider=self.twitter,
                identifier=1,
                user=self.partner,
                )
        ChannelPartnership.objects.create(
                producer=self.producer1,
                partner=self.partner,
                )
        self.t_campaign = Campaign.objects.create(
                title='Test Transactional Campaign',
                transactional=True,
                gdoc_key=0,
                producer=self.producer1)
        self.i_campaign = Campaign.objects.create(
                title='Test Inspirational Campaign',
                transactional=False,
                gdoc_key=1,
                producer=self.producer1)

        self.posting = []
        self.schedule_posting = []
        self.posting_log = []

        for i in range(10):
            for c in (self.t_campaign, self.i_campaign):
                for m in (self.fbpage, self.twitter):
                    self.posting.append(Posting.objects.create(
                            campaign=c,
                            message='Test #%d from campaign %s'%(i, c.title),
                            caption='',
                            description='',
                            label='',
                            picture='',
                            medium=m,
                            ))
                    s = ScheduledPosting.objects.create(
                            campaign=c,
                            advocate=self.partner,
                            message='Test Scheduled Posting #%d from campaign %s'%(i, c.title),
                            caption='',
                            description='',
                            label='',
                            link='',
                            picture='',
                            medium=self.fbpage,
                            fire_at=datetime.utcnow().replace(tzinfo=utc)
                        )
                    self.schedule_posting.append(s)
                    self.posting_log.append(PostingLog.objects.create(
                            posting=s,
                            accountaccess=self.fb_account,
                            created=datetime.utcnow().replace(tzinfo=utc),
                            ext_obj_id=self.fb_post_id
                        ))

        self.factory = RequestFactory()

    def test_overview_report(self):
        OverviewReport.objects.create(
            producer=self.producer1,
            partners=11,
            fans=20,
            followers=30,
            reach=40)
        cmd = '/rpt_overview{partners,fans,followers,reach,' \
              '/rpt_overview_age{age,total}.sort(total-),' \
              '/rpt_overview_locale{locale,total}.sort(total-),' \
              '/rpt_overview_country{country,total}.sort(total-),' \
              '/rpt_overview_gender{gender,total}.sort(total-)' \
              '}.filter(producer_id=$user)'
        request = self.factory.get(cmd)
        request.user = self.producer1
        response = htsql(request, cmd)
        print response

        cmd = '/rpt_partner{partner_id,fans,reach,impression,' \
              '/rpt_partner_age{age,total}.sort(total-),' \
              '/rpt_partner_locale{locale,total}.sort(total-),' \
              '/rpt_partner_country{country,total}.sort(total-),' \
              '/rpt_partner_gender{gender,total}.sort(total-)' \
              '}.filter(producer_id=$user).sort(partner_id)'
        response = htsql(request, cmd)
        print response

        cmd = '/rpt_campaign{campaign_id,reach,viral,engagement,new_fans' \
              '}.filter(producer_id=$user)'
        response = htsql(request, cmd)
        print response